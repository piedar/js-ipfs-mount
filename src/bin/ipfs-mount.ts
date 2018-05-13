#!/usr/bin/env ts-node

import { MountOptions, mountAll } from "../"
import * as commander from "commander"


const version = require("../../package.json").version
const command = commander
  .version(version)
  .option("--mfs [path]", "mount point for mfs (ipfs files)")
  .option("--ipfs [path]", "mount point for ipfs")
  .option("--fuse-options [options]", "comma-separated mount options to pass to fuse", (val) => val.split(","))
  .parse(process.argv)

const mountOptions = Object.assign(new MountOptions(), command);

mountAll(mountOptions)
  .then(() => console.log("done"))
  .catch(console.log);
