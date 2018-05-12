import * as util from "util"
import * as fs from "fs"
import { Path } from "./path"
import * as fuse from "fuse-bindings"
import { Mountable } from "./mount"
import { Readable, Writable } from "readable-stream"
const IpfsApi = require("ipfs-api")


function debug(...rest: any[]) {
  console.log(rest)
}

function stringify(value: Object): string {
  return JSON.stringify(value)
}


export class IpfsMountable implements Mountable {
  constructor(private readonly ipfs: typeof IpfsApi) { }

  mount(root: Path) {
    return new Promise((resolve, reject) =>
      fuse.mount(root, new IpfsMount(this.ipfs),
        (err) => err ? reject(err) : resolve()
    ));
  }

  unmount(root: Path) {
    return new Promise((resolve, reject) =>
      fuse.unmount(root,
        (err) => err ? reject(err) : resolve()
    ));
  }
}


function errorToCode(err: any): number {
  return typeof err === "number" ? err :
                err instanceof Error && err.message === "file does not exist" ? fuse.ENOENT :
                err instanceof Error && err.message === "path must contain at least one component" ? fuse.EPERM :
                -1;
}


async function ipfsCat_File(ipfs: typeof IpfsApi, ipfsPath: string, buffer: Buffer, segment: Segment):
  Promise<CatResult>
{
  const file: Buffer = await ipfs.cat(ipfsPath, segment);

  let fileOffset = 0
  if (file.byteLength > segment.length) {
    debug("fixme: ipfs.cat() ignored " + stringify(segment) + " and returned " + stringify({ offset: 0, length: file.byteLength }))
    fileOffset = segment.offset
  }

  const bytesCopied = file.copy(buffer, 0, fileOffset, fileOffset + segment.length)
  return { bytesCopied }
}

async function ipfsCat_ReadStream(ipfs: typeof IpfsApi, ipfsPath: string, buffer: Buffer, segment: Segment):
  Promise<CatResult>
{
  let position = 0
  const stream: Readable = ipfs.catReadableStream(ipfsPath, segment);

  if (stream.readableLength !== segment.length) {
    debug("fixme: ipfs.catReadableStream() ignored " + stringify(segment) + " and returned " + stringify({ offset: 0, length: stream.readableLength }))
  }

  stream.on("data", chunk => {
    debug({ chunk, chunkLength: chunk.length, position, capacity: buffer.byteLength })

    if (position >= segment.length) {
      // Calling stream.destroy() directly causes "Error: write after end".
      debug("destroying stream")
      Promise.resolve()
        .then(() => stream.destroy())
        .catch(debug)
      return
    }

    let bytesWritten: number

    if (typeof chunk === "string") {
      bytesWritten = buffer.write(chunk, position)
    }
    else {
      bytesWritten = chunk.copy(buffer, position, 0, segment.length - position)
    }

    debug({ bytesWritten })
    if (bytesWritten != chunk.length) debug("UH OH")

    position += bytesWritten
  })

  const streamEnd = () => new Promise((resolve, reject) => {
    stream.on("end", resolve)
    stream.on("error", reject)
  })

  await streamEnd();
  debug({ length: segment.length, position })
  return { bytesCopied: position }
}


class IpfsMount implements fuse.MountOptions {
  constructor(private readonly ipfs: typeof IpfsApi) {
    debug({ IpfsMount: this });
  }

  readonly create = (path: string, mode: number, reply: (err: number) => void) => {
    return reply(fuse.EROFS)
  }

  readonly open = (path: string, flags: number, cb: (code: number, fd: number) => void) => {
    debug("open " + path)
    return cb(0, 22)
  }

  readonly opendir = (path: string, flags: number, cb: (code: number, fd: number) => void) => {
    debug("opendir " + path)
    if (path === "/") return cb(fuse.EPERM, -1)
    return cb(0, 22)
  }

  //readonly statfs = (path: string, cb: (code: number, fsStat: fuse.FSStat) => void) => {
  //  debug("statfs " + path)
  //}

  readonly getattr = (path: string, cb: (code: number, stats: fuse.Stats) => void) => {
    const reply = (code: number, stats: fuse.Stats) => {
      debug({ stats });
      cb(code, stats)
    }
    const bail = (err: any, reason?: any) => {
      debug({ err, reason });
      reply(errorToCode(err), undefined!)
    }

    const now = new Date(Date.now())
    let stats = {
      dev: 0,
      ino: 0,
      size: 0,
      mode: 0,
      nlink: 0,
      uid: process.getuid ? process.getuid() : 0,
      gid: process.getgid ? process.getgid() : 0,
      rdev: 0,
      blksize: 0,
      blocks: 0,
      mtime: now,
      atime: now,
      ctime: now,
    }

    const ipfsPath = path === "/" ? path : "/ipfs/"+path

    this.ipfs.files.stat(ipfsPath)
      .then((ipfsStat: any) => {
        let [filetype, permissions] =
          ipfsStat.type === "directory" ? [fs.constants.S_IFDIR, 0o111] :
          ipfsStat.type === "file"      ? [fs.constants.S_IFREG, 0o444] :
                                          [0, 0o000]
        stats = Object.assign(stats, {
          size: ipfsStat.size,
          nlink: 1,
          mode: filetype | permissions
        })
        return reply(0, stats as fuse.Stats)
      })
      .catch((err: any) => bail(err, "ipfs files stat"))
  }

  readonly readdir = (path: string, cb: (code: number, lst: string[]) => void) => {
    debug("readdir " + path)

    const reply = (code: number, files: string[]) => {
      debug({ files });
      cb(code, files)
    }
    const bail = (err: any, reason?: any) => {
      debug({ err, reason });
      reply(errorToCode(err), [])
    }

    // todo: extra slashes cause "Error: path must contain at least one component"
    const ipfsPath = path === "/" ? path : "/ipfs"+path

    this.ipfs.ls(ipfsPath)
      .then((files: IpfsFileListing[]) => reply(0,
        files.filter(file => file.depth === 1).map(file => file.name)))
      .catch((err: any) => bail(err, "ipfs ls"))
  }

  readonly read = (path: string, fd: number, buffer: Buffer, length: number, offset: number, cb: (bytesReadOrErr: number) => void) => {
    debug("read " + path, { offset, length })

    const reply = (bytesReadOrError: number) => {
      debug({ bytesReadOrError });
      cb(bytesReadOrError)
    }
    const bail = (err: any, reason?: any) => {
      debug({ err, reason });
      reply(errorToCode(err))
    }

    if (path === "/") return bail(fuse.EPERM)

    const ipfsPath = path.substring(1)

    let ipfsCat = ipfsCat_File;     // slow but accurate
    //ipfsCat = ipfsCat_ReadStream; // potentially fast once it works

    ipfsCat(this.ipfs, ipfsPath, buffer, { offset, length })
      .then(result => reply(result.bytesCopied))
      .catch(debug)
  }
}

type CatResult = {
  bytesCopied: number
}

type Segment = {
  offset: number
  length: number
}

type IpfsFileListing = {
  depth: number,
  name: string,
  path: string,
  size: number,
  hash: string,
  type: "file" | "directory",
}
