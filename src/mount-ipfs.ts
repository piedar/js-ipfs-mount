import * as util from "util"
import * as fs from "fs"
import { Path } from "./path"
import * as fuse from "fuse-bindings"
import { Mountable } from "./mount"
const IpfsApi = require("ipfs-api")


function debug(...rest: any[]) {
  console.log(rest)
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


function codeFromError(err: any): number {
  return typeof err === "number" ? err :
                err instanceof Error && err.message === "file does not exist" ? fuse.ENOENT :
                err instanceof Error && err.message === "path must contain at least one component" ? fuse.EPERM :
                -1;
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
      reply(codeFromError(err), undefined!)
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
      reply(codeFromError(err), [])
    }

    // todo: extra slashes cause "Error: path must contain at least one component"
    const ipfsPath = path === "/" ? path : "/ipfs"+path

    this.ipfs.ls(ipfsPath)
      .then((files: IpfsFileListing[]) => reply(0,
        files.filter(file => file.depth === 1).map(file => file.name)))
      .catch((err: any) => bail(err, "ipfs ls"))
  }
}

type IpfsFileListing = {
  depth: number,
  name: string,
  path: string,
  size: number,
  hash: string,
  type: "file" | "directory",
}
