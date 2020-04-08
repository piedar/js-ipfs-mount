import Fuse = require("fuse-native")

export function errorToFuseCode(err: any): number {
  return typeof err === "number" ? err
       : err && err.message === "file does not exist" ? Fuse.ENOENT
       : err && err.message === "path must contain at least one component" ? Fuse.EPERM
       : Fuse.EREMOTEIO;
}
