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



class IpfsMount implements fuse.MountOptions {
  constructor(private readonly ipfs: typeof IpfsApi) {
    debug({ IpfsMount: this });
  }

  readonly create = (path: string, mode: number, reply: (err: number) => void) => {
    return reply(fuse.EROFS)
  }

  //readonly statfs = (path: string, cb: (code: number, fsStat: fuse.FSStat) => void) => {
  //  console.log("go go statfs")
  //}

  readonly getattr = (path: string, cb: (code: number, stats: fuse.Stats) => void) => {
    const reply = (code: number, stats: fuse.Stats) => {
      debug({ stats });
      cb(code, stats)
    }
    const bail = (err: any, reason?: any) => {
      const code = typeof err === "number" ? err :
                   err instanceof Error && err.message === "file does not exist" ? fuse.ENOENT :
                   -1;
      debug({ err, reason });
      reply(code, undefined!)
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

    const ipfsPath = path === "/" ? path : "/ipfs/" + path

    this.ipfs.files.stat(ipfsPath, (err: any, ipfsStat: any) => {
      if (err) return bail(err, "ipfs files stat")

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
  }
}
