import * as util from "util";
import { Path } from "./path";
const FuseMfs = require("ipfs-fuse");


export async function mountMfs(root: Path, done: Promise<void>) {
  const mountAsync = util.promisify(FuseMfs.mount);
  const unmountAsync = util.promisify(FuseMfs.unmount);

  await mountAsync(root, {
    ipfs: { },
    fuse: { displayFolder: true }
  })

  console.log(`ready ${root}`)

  try {
    await done;
  }
  finally {
    await unmountAsync(root);
  }
}
