#!/usr/bin/env ts-node

import * as command from "commander"
import * as mount from "../lib/mount"
import { IpfsMountable } from "../lib/ipfs-mount"
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

const target: string | undefined = command.target
  || (command.args.length == 1 ? command.args[0]
    : undefined);

if (!target) {
  console.log("must specify a target")
  throw command.help()
}

const ipfsOptions = { }
const ipfs = new IpfsApi(ipfsOptions)
const fuseOptions = { displayFolder: false, options: command.fuseOptions }

mount.untilDone(new IpfsMountable(ipfs, fuseOptions), target, done)
  .catch(console.log)
