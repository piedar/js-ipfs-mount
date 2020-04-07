import Fuse = require("fuse-native")
const debug = require("debug")("mount")


export async function untilDone<TResult>(fuse: Fuse, done: () => Promise<TResult>): Promise<TResult> {
  debug("mount pending")
  await new Promise((resolve, reject) => fuse.mount(err => err ? reject(err) : resolve()))
  debug("mount ready")

  try { return await done() }
  finally {
    debug("unmount pending")
    await new Promise((resolve, reject) => fuse.unmount(err => err ? reject(err) : resolve()))
    debug("unmount complete")
  }
}
