import { Path } from "./path";
import { MfsMountable } from "./mount-mfs";
import { IpfsMountable } from "./mount-ipfs";
const IpfsApi = require("ipfs-api")


export interface Mountable {
  mount(root: Path): Promise<any>
  unmount(root: Path): Promise<any>
}

export class MountOptions {
  mfs?: Path = undefined
  ipfs?: Path = undefined
  ipns?: Path = undefined

  ipfsOptions = { }
  fuseOptions = new Array<string>()

  done(message: string): Promise<void> {
    console.log(message)
    return new Promise((resolve, reject) => {
      process.on("SIGINT", () => resolve());
      //process.on("SIGTERM", () => resolve());
    });
  }
}

export async function mountUntilDone<T>(m: Mountable, root: Path, done: (message: string) => Promise<T>): Promise<T> {
  await m.mount(root)
  try { return await done(`mounted ${root}`) }
  finally { await m.unmount(root) }
}

export async function mountAll(options: MountOptions) {
  const mounts = new Array<Promise<void>>()
  const ipfs = new IpfsApi(options.ipfsOptions)

  if (options.mfs) {
    mounts.push(mountUntilDone(new MfsMountable(options.ipfsOptions), options.mfs, options.done));
  }

  if (options.ipfs) {
    mounts.push(mountUntilDone(new IpfsMountable(ipfs, options.fuseOptions), options.ipfs, options.done));
  }

  if (mounts.length == 0) {
    throw new Error("Must specify at least one mount point")
  }
  await Promise.all(mounts)
}
