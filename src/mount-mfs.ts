import * as util from "util";
import * as fuse from "fuse-bindings"
import { Path } from "./path";
import { Mountable } from "./mount"
const FuseMfs = require("ipfs-fuse");


const mountAsync = util.promisify(FuseMfs.mount);
const unmountAsync = util.promisify(FuseMfs.unmount);

export class MfsMountable implements Mountable {
  constructor(
    private readonly ipfsOptions = { },
    private readonly fuseOptions: fuse.MountOptions = { displayFolder: true },
  ) { }

  mount(root: Path) {
    return mountAsync(root, { ipfs: this.ipfsOptions, fuse: this.fuseOptions })
  }

  unmount(root: Path) {
    return unmountAsync(root)
  }
}
