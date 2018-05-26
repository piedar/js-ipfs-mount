#!/usr/bin/env ts-node

import * as command from "commander"
import * as mount from "../lib/mount"
import { MfsMountable } from "../lib/mount-mfs"
import { done } from "../lib/signals"
import { version } from "../lib/version"
const IpfsApi = require("ipfs-api")


command
  .version(version)

command
  .arguments("[target]")
  .description("mount mutable file system")
  .option("--target <dir>", "mount point", "/mfs")
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_unmount", "big_writes"]
  )

command.parse(process.argv)

if (!command.target) {
  console.log("must specify a target")
  command.help()
}

const ipfsOptions = { }
const fuseOptions = { displayFolder: true, options: command.fuseOptions }

mount.untilDone(new MfsMountable(ipfsOptions, fuseOptions), command.target, done)
  .then(() => console.log("done"))
  .catch(console.log)
