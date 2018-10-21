#!/usr/bin/env ts-node

import * as command from "commander"
import * as IpfsApi from "ipfs-api"
import * as mount from "../lib/mount"
import { flatten } from "../lib/extensions"
import { IpfsMountable } from "../lib/ipfs-mount"
import { done } from "../lib/signals"
import { version } from "../lib/version"


const targetDefault = "/ipfs"
const optionsDefault = ["auto_cache", "auto_unmount"]

command
  .version(version)

command
  .arguments("[target]")
  .description("mount interplanetary file system")
  .option("--target <dir>", `mount point (default: ${targetDefault})`)
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), optionsDefault
  )

command.parse(process.argv)


const target =
    command.target ? command.target as string
  : command.args.length == 1 ? command.args[0]
  : targetDefault;

const options = flatten(
  (command.fuseOptions as string[])
    .map(opt => opt === "defaults" ? optionsDefault : [opt])
);

if (!target) {
  console.log("must specify a target")
  throw command.help()
}


const ipfsOptions = { }
const ipfs = new IpfsApi(ipfsOptions)
const fuseOptions = { displayFolder: false, options: options }

mount.untilDone(IpfsMountable(ipfs, fuseOptions), target, done)
  .catch(console.log)
