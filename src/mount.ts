import { Path } from "./path";


export interface Mountable {
  mount(root: Path): Promise<any>
  unmount(root: Path): Promise<any>
}

export async function untilDone<T>(m: Mountable, root: Path, done: (message: string) => Promise<T>): Promise<T> {
  await m.mount(root)
  try { return await done(`mounted ${root}`) }
  finally { await m.unmount(root) }
}
