#!/usr/bin/env ts-node

import * as command from "commander"
import * as mount from "../lib/mount"
import { IpfsMountable } from "../lib/mount-ipfs"
import { done } from "../lib/signals"
import { version } from "../lib/version"
const IpfsApi = require("ipfs-api")


command
  .version(version)

command
  .arguments("[target]")
  .description("mount interplanetary file system")
  .option("--target <dir>", "mount point", "/ipfs")
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_cache", "auto_unmount"]
  )

command.parse(process.argv)

if (!command.target) {
  console.log("must specify a target")
  command.help()
}

const ipfsOptions = { }
const ipfs = new IpfsApi(ipfsOptions)
const fuseOptions = { displayFolder: false, options: command.fuseOptions }

mount.untilDone(new IpfsMountable(ipfs, fuseOptions), command.target, done)
  .then(() => console.log("done"))
  .catch(console.log)
