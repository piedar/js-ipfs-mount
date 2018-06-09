#!/usr/bin/env ts-node

import * as command from "commander"
import * as mount from "../lib/mount"
import { MfsMountable } from "../lib/mfs-mount"
import { done } from "../lib/signals"
import { version } from "../lib/version"
const IpfsApi = require("ipfs-api")


const targetDefault = "/mfs"

command
  .version(version)

command
  .arguments("[target]")
  .description("mount mutable file system")
  .option("--target <dir>", `mount point (default: ${targetDefault})`)
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), ["auto_unmount", "big_writes"]
  )

command.parse(process.argv)


const target =
    command.target ? command.target as string
  : command.args.length == 1 ? command.args[0]
  : targetDefault;

if (!target) {
  console.log("must specify a target")
  throw command.help()
}

const ipfsOptions = { }
const fuseOptions = { displayFolder: true, options: command.fuseOptions }

mount.untilDone(new MfsMountable(ipfsOptions, fuseOptions), target, done)
  .catch(console.log)
