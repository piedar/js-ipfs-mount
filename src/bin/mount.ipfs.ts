#!/usr/bin/env ts-node

import * as program from "commander"
import { done } from "../signals"
import * as mount from "../mount"
import { IpfsMountable } from "../mount-ipfs"
const IpfsApi = require("ipfs-api")
const version = require("../../package.json").version


program
  .version(version)

program
  .arguments("[target]")
  .description("mount interplanetary file system")
  .option("--target <dir>", "mount point", "/ipfs")
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_cache", "auto_unmount"]
  )

program.parse(process.argv)

if (!program.target) {
  console.log("must specify a target")
  program.help()
}

const ipfsOptions = { }
const ipfs = new IpfsApi(ipfsOptions)
const fuseOptions = { displayFolder: false, options: program.fuseOptions }

mount.untilDone(new IpfsMountable(ipfs, fuseOptions), program.target, done)
  .then(() => console.log("done"))
  .catch(console.log)
