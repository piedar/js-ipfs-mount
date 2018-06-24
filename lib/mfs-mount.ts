import * as util from "util";
import * as fuse from "fuse-bindings"
import { Path } from "./path";
import { Mountable } from "./mount"
const debug = require("debug")("MfsMountable")
const IpfsApi = require("ipfs-api")
const FuseMfs = require("ipfs-fuse");


const mountAsync = util.promisify(FuseMfs.mount);
const unmountAsync = util.promisify(FuseMfs.unmount);

export class MfsMountable implements Mountable {
  constructor(
    private readonly ipfsOptions = { },
    fuseOptions: fuse.MountOptions = { },
  ) {
    const ipfs = new IpfsApi(ipfsOptions)
    const writer = MfsWriter_WriteBack(ipfs)
    // caller's options override the defaults
    this.fuseOptions = Object.assign(MfsMount(ipfs, writer), fuseOptions)
  }

  private readonly fuseOptions: fuse.MountOptions

  mount(root: Path) {
    return mountAsync(root, { ipfs: this.ipfsOptions, fuse: this.fuseOptions })
  }

  unmount(root: Path) {
    return unmountAsync(root)
  }
}

function MfsMount(ipfs: typeof IpfsApi, writer: MfsWriter): fuse.MountOptions {
  const start = Date.now()

  return {
    displayFolder: true,

    chown: (path: string, uid: number, gid: number, cb: (err: number) => void) => {
      debug("custom chown " + path, { uid, gid, cb })
      debug("fixme: chown does nothing")
      return cb(0)
    },

    chmod: (path: string, mode: any, cb: (err: number) => void) => {
      debug("custom chmod " + path, { mode, cb })
      debug("fixme: chmod does nothing")
      return cb(0)
    },

    getattr: (path: string, cb: (err: number, stats: fuse.Stats) => void) => {
      debug("custom getattr " + path)

      const reply = (stats: fuse.Stats) => {
        debug(stats)
        return cb(0, stats)
      }
      const bail = (err: number, message?: any) => {
        debug({ err, message })
        return cb(err, undefined!)
      }

      ipfs.files.stat(path, (err: any, stat: any) => {
        if (err) {
          const errno = err.message === 'file does not exist' ? fuse.ENOENT
                      : fuse.EREMOTEIO;
          return bail(errno, err)
        }

        // blksize is vital for write performance
        // todo: wget and curl max out at 8192?

        // todo: mtime, atime, ctime are wrong
        // might get weird results when using auto_cache
        const now = Date.now()

        reply({
          blksize: 256 * 1024,

          mtime: now,
          atime: now,
          ctime: now,
          nlink: 1,
          size: stat.size,
          // https://github.com/TooTallNate/stat-mode/blob/master/index.js
          mode: stat.type === 'directory' ? 16877 : 33188,
          uid: process.getuid ? process.getuid() : 0,
          gid: process.getgid ? process.getgid() : 0
        } as any)
      })
    },

    write: (path, fd, buf, len, pos, reply) => {
      debug("write", { path, len, pos })

      writer.write(path, buf, pos, len)
        .then(() => reply(len))
        .catch((err: any) => {
          debug({ err })
          reply(fuse.EREMOTEIO)
        })
    },

    flush: (path, fd, reply) => {
      debug("flush", { path })

      writer.flush(path)
        .then(() => reply(0))
        .catch((err: any) => {
          debug({ err })
          reply(fuse.EREMOTEIO)
        })
    }
  }
}


type MfsWriter = {
  write: (path: string, buffer: Buffer, offset: number, count: number) => Promise<void>
  flush: (path: string) => Promise<void>
}

function MfsWriter_Direct(ipfs: typeof IpfsApi): MfsWriter {
  return {
    write: (path: string, buffer: Buffer, offset: number, count: number) => {
      return ipfs.files.write(path, buffer, { offset: offset, count: count, flush: false })
    },
    flush: (path: string) => {
      return ipfs.files.flush(path)
    }
  }
}





type Range = {
  start: number, end: number,
}

function length(x: Range) {
  return x.end + 1 - x.start
}

/// true iff y starts immediately after x ends
function contiguous(x: Range, y: Range): boolean {
  return x.end + 1 === y.start
}

/// true iff x and y do not overlap
function discrete(x: Range, y: Range): boolean {
  return x.end <= y.start || y.end <= x.start
}

function overlap(x: Range, y: Range) { return !discrete(x, y) }



type WritableChunk = Range & {
  path: string,
  buffer: Buffer,
}


function merge(bottom: WritableChunk, top: WritableChunk) {
  if (bottom.path !== top.path) return undefined
  if (discrete(bottom, top) && !contiguous(bottom, top)) return undefined

  const topStart = 0
  const topEnd = topStart + length(top) - 1

  const bottomStart = bottom.start < top.start ? 0 : topEnd + 1
  const bottomEnd = bottomStart + length(bottom) - 1

  const merged = {
    start: Math.min(bottom.start, top.start),
    end: Math.max(bottom.end, top.end),
    path: bottom.path,
    buffer: Buffer.concat([
      // slice end is not inclusive!
      bottom.buffer.slice(bottomStart, bottomEnd + 1),
      top.buffer.slice(topStart, topEnd + 1)
    ]),
  }

  if (length(merged) !== merged.buffer.byteLength) {
    throw new Error(`expected length ${length(merged)} but got length ${merged.buffer.byteLength}`)
  }

  debug("merged chunks", { start: merged.start, end: merged.end, length: length(merged) })
  return merged
}

function* mergeAll(existing: WritableChunk[], top: WritableChunk) {
  let merged = undefined

  for (const bottom of existing) {
    if (!merged) {
      merged = merge(bottom, top)
      if (merged) {
        yield merged
        top = merged
        continue
      }
    }

    yield bottom
  }

  if (!merged) {
    yield top
  }
}

function* splitAll(existing: WritableChunk[], maxLength: number): IterableIterator<WritableChunk> {
  for (const bottom of existing) {
    if (length(bottom) <= maxLength) {
      yield bottom
      continue
    }

    yield bottom // todo
    continue

    /*
    const bottomStart = 0
    const bottomEnd = bottomStart + maxLength - 1

    const newTopStart = bottomEnd + 1
    const newTopEnd = length(bottom) - newTopStart

    yield {
      start: bottom.start,
      end: bottom.start + maxLength - 1,
      path: bottom.path,
      buffer: bottom.buffer.slice(bottomStart, bottomEnd + 1)
    }
    */
  }
}

function MfsWriter_WriteBack(ipfs: typeof IpfsApi): MfsWriter {
  const targetLength = 1024 * 1024
  let pendingChunks = new Array<WritableChunk>()

  async function writeback(predicate: (c: WritableChunk) => boolean) {
    for (let i = pendingChunks.length - 1; i >= 0; i--) {
      const chunk = pendingChunks[i]
      if (predicate(chunk)) {
        debug("writeback", { start: chunk.start, end: chunk.end, length: length(chunk) })
        pendingChunks.splice(i, 1)
        await ipfs.files.write(chunk.path, chunk.buffer, {
          offset: chunk.start, count: length(chunk)
        })
      }
    }
  }

  return {
    write: (path, buffer, offset, count) => {
      pendingChunks = Array.from(mergeAll(pendingChunks, {
        start: offset, end: offset + count - 1,
        path: path, buffer: buffer,
      }))

      pendingChunks = Array.from(splitAll(pendingChunks, targetLength))


      return writeback(c => length(c) >= targetLength)
    },

    flush: (path) => {
      return writeback(c => true)
    },
  }
}
