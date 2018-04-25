import * as util from "util"
import { Path } from "./path"
import * as fuse from "fuse-bindings"
import { Mountable } from "./mount"
const ipfs = require("ipfs-api")


const IpfsMount: fuse.MountOptions = {
  statfs(path: string, cb: (code: number, fsStat: fuse.FSStat) => void) {
    // todo
  }
}

export const IpfsMountable: Mountable = {
  mount(root: Path) {
    return new Promise((resolve, reject) =>
      fuse.mount(root, IpfsMount,
        (err) => err ? reject(err) : resolve()
    ));
  },

  unmount(root: Path) {
    return new Promise((resolve, reject) =>
      fuse.unmount(root,
        (err) => err ? reject(err) : resolve()
    ));
  }
}
