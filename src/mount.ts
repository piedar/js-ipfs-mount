import { Path } from "./path";
import { MfsMountable } from "./mount-mfs";
import { IpfsMountable } from "./mount-ipfs";
import * as commander from "commander";
const version = require("../package.json").version;


export interface Mountable {
  mount(root: Path): Promise<void>
  unmount(root: Path): Promise<void>
}

class MountOptions {
  mfs?: Path = undefined
  ipfs?: Path = undefined
  ipns?: Path = undefined
  done: Promise<void> = new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
    //process.on("SIGTERM", () => resolve());
  });
}

async function mountUntilDone(m: Mountable, root: Path, done: Promise<void>) {
  await m.mount(root)
  console.log(`mounted ${root}`)
  try { await done }
  finally { await m.unmount(root) }
}

async function mountAll(options: MountOptions) {
  const mounts = new Array<Promise<void>>()

  if (options.mfs) {
    mounts.push(mountUntilDone(MfsMountable, options.mfs, options.done));
  }

  if (options.ipfs) {
    mounts.push(mountUntilDone(IpfsMountable, options.ipfs, options.done));
  }

  if (mounts.length == 0) {
    throw new Error("Must specify at least one mount point")
  }
  await Promise.all(mounts)
}


const command = commander
  .version(version)
  .option("--mfs [path]", "mount point for mfs (ipfs files)")
  .option("--ipfs [path]", "mount point for ipfs")
  .parse(process.argv)

const mountOptions = Object.assign(new MountOptions(), command);

mountAll(mountOptions)
  .then(() => console.log("done"))
  .catch(console.log);
