import * as os from "os";
import * as path from "path";
import * as util from "util";
const FuseMfs = require("ipfs-fuse");


function delay(msTime: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msTime)
  })
}



class MountOptions {
  mfsRoot?: string = "./mfs"
  ipfsRoot?: string = undefined
  ipnsRoot?: string = undefined
  done: Promise<void> = new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
  });
}

async function mountMfs(options: MountOptions = new MountOptions()) {
  if (!options.mfsRoot) return;

  const mountAsync = util.promisify(FuseMfs.mount);
  const unmountAsync = util.promisify(FuseMfs.unmount);

  await mountAsync(options.mfsRoot, {
    ipfs: { },
    fuse: { displayFolder: true }
  })

  console.log(`ready ${options.mfsRoot}`)

  try {
    await options.done;
  }
  finally {
    await unmountAsync(options.mfsRoot);
  }
}

mountMfs()
  .then(() => console.log("done"))
  .catch(console.log);
