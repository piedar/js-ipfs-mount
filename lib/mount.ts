import { Path } from "./path";
const debug = require("debug")("mount")


export interface Mountable {
  mount(root: Path): Promise<any>
  unmount(root: Path): Promise<any>
}

export async function untilDone<T>(m: Mountable, root: Path, done: () => Promise<T>): Promise<T>
{
  const trace = (...rest: any[]) => {
    debug(rest, { root, what: m.constructor.name })
  }

  trace("mount pending")
  await m.mount(root)
  trace("mount ready")

  try { return await done() }
  finally {
    trace("unmount pending")
    await m.unmount(root)
    trace("unmount complete")
  }
}
