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
    const now = Date.now()
    const ipfs = new IpfsApi(ipfsOptions)

    this.fuseOptions = {
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
        const bail = (err: number, message?: string) => {
          debug({ err, message })
          return cb(err, undefined!)
        }

        ipfs.files.stat(path, (err: any, stat: any) => {
          if (err) {
            if (err.message === 'file does not exist') return cb(fuse.ENOENT, undefined!)
            return bail(fuse.EREMOTEIO, err.message)
          }

          // blksize is vital for write performance
          // todo: wget and curl max out at 8192?

          // todo: mtime, atime, ctime are wrong
          // might get weird results when using auto_cache

          reply({
            blksize: 16 * 1024,

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
      }
    }

    // caller's options override the defaults
    this.fuseOptions = Object.assign(this.fuseOptions, fuseOptions)
  }

  private readonly fuseOptions: fuse.MountOptions

  mount(root: Path) {
    return mountAsync(root, { ipfs: this.ipfsOptions, fuse: this.fuseOptions })
  }

  unmount(root: Path) {
    return unmountAsync(root)
  }
}