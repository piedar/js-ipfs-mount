import { Path } from "./path";
import { mountMfs } from "./mount-mfs";
import * as commander from "commander";
const version = require("../package.json").version;


class MountOptions {
  mfs?: Path = undefined
  ipfs?: Path = undefined
  ipns?: Path = undefined
  done: Promise<void> = new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
    process.on("SIGTERM", () => resolve());
  });
}

async function mount(options: MountOptions) {
  const mounts = new Array<Promise<void>>()

  if (options.mfs) {
    mounts.push(mountMfs(options.mfs, options.done));
  }

  if (mounts.length == 0) {
    throw new Error("Must specify at least one mount point")
  }
  await Promise.all(mounts)
}


const command = commander
  .version(version)
  .option("--mfs [path]", "mount point for mfs (ipfs files)")
  .parse(process.argv)

const mountOptions = Object.assign(new MountOptions(), command);

mount(mountOptions)
  .then(() => console.log("done"))
  .catch(console.log);
