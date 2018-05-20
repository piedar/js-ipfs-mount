#!/usr/bin/env ts-node

import * as program from "commander"
import { done } from "../signals"
import * as mount from "../mount"
import { MfsMountable } from "../mount-mfs"
const IpfsApi = require("ipfs-api")
const version = require("../../package.json").version


program
  .version(version)

program
  .arguments("[target]")
  .description("mount mutable file system")
  .option("--target <dir>", "mount point", "/mfs")
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_cache", "auto_unmount"]
  )

program.parse(process.argv)

if (!program.target) {
  console.log("must specify a target")
  program.help()
}

const ipfsOptions = { }
const fuseOptions = { displayFolder: true, options: program.fuseOptions }

mount.untilDone(new MfsMountable(ipfsOptions, fuseOptions), program.target, done)
  .then(() => console.log("done"))
  .catch(console.log)
