#!/usr/bin/env ts-node

import * as command from "commander"
import { done } from "../signals"
import * as mount from "../mount"
import { IpfsMountable } from "../mount-ipfs"
const IpfsApi = require("ipfs-api")
const version = require("../../package.json").version


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
