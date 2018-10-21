import * as util from "util"
import * as fs from "fs"
import * as IpfsApi from "ipfs-api"
import * as fuse from "fuse-bindings"
import { getOrAdd } from "./extensions"
import { Mountable } from "./mount"
import { IpfsReader, IpfsReader_Direct } from "./ipfs-read"
const debug = require("debug")("IpfsMount")


export function IpfsMountable(
  ipfs: IpfsApi,
  extraFuseOptions: fuse.MountOptions = { },
): Mountable {

  return {
    mount: (root: string) => {
      const reader = IpfsReader_Direct(ipfs)
      const mountOptions = {
        ...new IpfsMount(ipfs, reader),
        ...extraFuseOptions,
      }
      return new Promise((resolve, reject) =>
        fuse.mount(root, mountOptions,
          (err) => err ? reject(err) : resolve()
      ));
    },

    unmount: (root: string) => {
      return new Promise((resolve, reject) =>
        fuse.unmount(root,
          (err) => err ? reject(err) : resolve()
      ));
    },
  }
}

function errorToCode(err: any): number {
  return typeof err === "number" ? err
       : err instanceof Error && err.message === "file does not exist" ? fuse.ENOENT
       : err instanceof Error && err.message === "path must contain at least one component" ? fuse.EPERM
       : -1;
}

class IpfsMount implements fuse.MountOptions {
  constructor(private readonly ipfs: IpfsApi, private readonly reader: IpfsReader) { }

  public displayFolder = false;

  private readonly firstAccessByPath = new Map<string, Date>();

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
    const firstAccess = getOrAdd(this.firstAccessByPath, path, now)

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
      ctime: firstAccess,
      mtime: firstAccess,
      atime: now,
    }

    const ipfsPath = path === "/" ? path : "/ipfs/"+path

    this.ipfs.files.stat(ipfsPath)
      .then((ipfsStat: any) => {
        debug({ ipfsStat })

        const [filetype, permissions] =
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
      .then((files) => reply(0,
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
      // make sure the return code is negative
      reply(-Math.abs(errorToCode(err)))
    }

    if (path === "/") return bail(fuse.EPERM)

    const ipfsPath = path.substring(1)

    this.reader.read(ipfsPath, buffer, { offset, length })
      .then(result => reply(result.length))
      .catch(bail)
  }
}
