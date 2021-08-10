#!/usr/bin/env ts-node

import { program as command } from "commander"
import Fuse = require("fuse-native")
import * as IpfsHttpClient from "ipfs-http-client"

import * as mount from "../lib/mount"
import { flatten } from "../lib/extensions"
import { MfsMount } from "../lib/mfs-mount"
import { done } from "../lib/signals"
import { version } from "../lib/version"
import { parseFuseOptions } from "../lib/fuse-options"


const targetDefault = "/mfs"
const optionsDefault = ["auto_unmount", "big_writes"]

command
  .version(version)
  .arguments("[target]")
  .description("mount mutable file system")
  .option("--target <dir>", `mount point (default: ${targetDefault})`)
  .option("-o, --fuse-options <options>", "comma-separated fuse options - see `man mount.fuse`",
    (val) => val.split(","), optionsDefault
  )

command.parse(process.argv)


const target = command.opts().target || command.args[0] || targetDefault

const fuseOptions = parseFuseOptions(flatten(
  (command.opts().fuseOptions as string[])
    .map(opt => opt === "defaults" ? optionsDefault : [opt])
))

if (!target) {
  console.log("must specify a target")
  command.help()
}

const ipfsOptions = { }
const ipfs = IpfsHttpClient.create(ipfsOptions)
const fuse = new Fuse(target, MfsMount(ipfs), { displayFolder: 'mfs', ...fuseOptions })

mount.untilDone(fuse, done)
  .catch(console.error)
