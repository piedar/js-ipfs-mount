import * as util from "util";
import * as fuse from "fuse-bindings"
import * as IpfsApi from "ipfs-api"
import { Mountable } from "./mount"
const debug = require("debug")("MfsMountable")
const FuseMfs = require("ipfs-fuse");

const mountAsync = util.promisify(FuseMfs.mount);
const unmountAsync = util.promisify(FuseMfs.unmount);


export function MfsMountable(
  ipfsOptions: IpfsApi.Options = { },
  extraFuseOptions: fuse.MountOptions = { },
): Mountable {

  const ipfs = new IpfsApi(ipfsOptions)

  return {
    mount: (root: string) => {
      const reader = MfsReader_Direct(ipfs)
      const writer = MfsWriter_Direct(ipfs)
      const fuseOptions = {
        ...MfsMount(ipfs, reader, writer),
        ...extraFuseOptions,
      }
      return mountAsync(root, { ipfs: ipfsOptions, fuse: fuseOptions })
    },

    unmount: (root: string) => unmountAsync(root),
  }
}

function errorToCode(err: any): number {
  return typeof err === "number" ? err
       : err instanceof Error && err.message === "file does not exist" ? fuse.ENOENT
       : err instanceof Error && err.message === "path must contain at least one component" ? fuse.EPERM
       : -1;
}

function MfsMount(ipfs: IpfsApi, reader: MfsReader, writer: MfsWriter): fuse.MountOptions {
  const start = Date.now()

  return {
    displayFolder: true,

    read: (path, fd, buffer, length, offset, cb) => {
      debug("read " + path, { offset, length })

      const reply = (bytesReadOrError: number) => {
        debug({ bytesReadOrError });
        cb(bytesReadOrError)
      }
      const bail = (err: any, reason?: any) => {
        debug({ err, reason });
        reply(errorToCode(err))
      }

      reader.read(path, buffer, { offset, length })
        .then(result => reply(result.length))
        .catch(bail)
    },

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

      ipfs.files.stat(path)
        .then((ipfsStat: any) => {
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
            size: ipfsStat.size,
            // https://github.com/TooTallNate/stat-mode/blob/master/index.js
            mode: ipfsStat.type === 'directory' ? 16877 : 33188,
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0
          } as any)
        })
        .catch((err: any) => {
          const errno = err && err.message === 'file does not exist' ? fuse.ENOENT
                      : fuse.EREMOTEIO;
          return bail(errno, err)
        })
    },

    write: (path, fd, buf, len, pos, reply) => {
      debug("write", { path, len, pos })

      writer.write(path, buf, { offset: pos, length: len })
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


type MfsReader = {
  read: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => Promise<IpfsApi.Segment>
}

export function MfsReader_Direct(ipfs: IpfsApi): MfsReader {
  return {
    read: async (path, buffer, segment) => {
      const chunk = await ipfs.files.read(path, segment)

      let fileOffset = 0
      if (chunk.byteLength > segment.length) {
        debug("fixme: ipfs.cat() ignored ", { segment }, " and returned ", { offset: 0, length: chunk.byteLength })
        fileOffset = segment.offset
      }

      const bytesCopied = chunk.copy(buffer, 0, fileOffset, fileOffset + segment.length)
      return { offset: segment.offset, length: bytesCopied }
    },
  }
}


type MfsWriter = {
  write: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => Promise<void>
  flush: (path: string) => Promise<void>
}

export function MfsWriter_Direct(ipfs: IpfsApi): MfsWriter {
  return {
    write: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => {
      return ipfs.files.write(path, buffer, { ...segment, flush: false })
    },
    flush: (path: string) => {
      return ipfs.files.flush(path)
    }
  }
}
