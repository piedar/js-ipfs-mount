import * as util from "util";
import { Path } from "./path";
import { Mountable } from "./mount"
const FuseMfs = require("ipfs-fuse");


const mountAsync = util.promisify(FuseMfs.mount);
const unmountAsync = util.promisify(FuseMfs.unmount);

export const MfsMountable: Mountable = {
  async mount(root: Path) {
    await mountAsync(root, {
      ipfs: { },
      fuse: { displayFolder: true }
    })
  },

  unmount: (root: Path) => unmountAsync(root)
}
