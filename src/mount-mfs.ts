import * as util from "util";
import { Path } from "./path";
import { Mountable } from "./mount"
const FuseMfs = require("ipfs-fuse");


const mountAsync = util.promisify(FuseMfs.mount);
const unmountAsync = util.promisify(FuseMfs.unmount);

export class MfsMountable implements Mountable {
  constructor(private readonly ipfsOptions?: any) { }

  mount(root: Path) {
    return mountAsync(root, {
      ipfs: this.ipfsOptions || { },
      fuse: { displayFolder: true }
    })
  }

  unmount(root: Path) {
    return unmountAsync(root)
  }
}
