#!/usr/bin/env ts-node

import * as program from "commander"
import * as mount from "../mount"
import { MfsMountable } from "../mount-mfs"
import { IpfsMountable } from "../mount-ipfs"
const IpfsApi = require("ipfs-api")
const version = require("../../package.json").version


function done(message: string): Promise<void> {
  console.log(message)
  return new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
    //process.on("SIGTERM", () => resolve());
  });
}

const ipfsOptions = { }
const ipfs = new IpfsApi(ipfsOptions)
const mounts = new Array<Promise<void>>()

program
  .version(version)

program
  .command("mfs")
  .description("mount mutable file system")
  .option("--root <dir>", "mount point", "/mfs")
  .action((options) => {
    mounts.push(mount.untilDone(new MfsMountable(ipfsOptions), options.root, done))
  })

program
  .command("ipfs")
  .description("mount interplanetary file system")
  .option("--root <dir>", "mount point", "/ipfs")
  .option("--fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_cache", "auto_unmount"]
  )
  .action((options) => {
    mounts.push(mount.untilDone(new IpfsMountable(ipfs, options.fuseOptions), options.root, done));
  })

program.parse(process.argv);

if (mounts.length == 0) {
  console.log("must specify a command")
  program.help()
}

Promise.all(mounts)
  .then(() => console.log("done"))
  .catch(console.log)
