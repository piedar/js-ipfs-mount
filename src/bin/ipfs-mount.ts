#!/usr/bin/env node

import { MountOptions, mountAll } from "../"
import * as commander from "commander"


const version = require("../../package.json").version
const command = commander
  .version(version)
  .option("--mfs [path]", "mount point for mfs (ipfs files)")
  .option("--ipfs [path]", "mount point for ipfs")
  .parse(process.argv)

const mountOptions = Object.assign(new MountOptions(), command);

mountAll(mountOptions)
  .then(() => console.log("done"))
  .catch(console.log);
