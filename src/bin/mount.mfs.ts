#!/usr/bin/env ts-node

import * as command from "commander"
import { done } from "../signals"
import * as mount from "../mount"
import { MfsMountable } from "../mount-mfs"
const IpfsApi = require("ipfs-api")
const version = require("../../package.json").version


command
  .version(version)

command
  .arguments("[target]")
  .description("mount mutable file system")
  .option("--target <dir>", "mount point", "/mfs")
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_cache", "auto_unmount", "big_writes"]
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
