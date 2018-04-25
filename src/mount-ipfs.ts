import * as util from "util"
import { Path } from "./path"
import * as fuse from "fuse-bindings"


export async function mountIpfs(root: Path, done: Promise<void>) {
  const mountAsync = () => new Promise((resolve, reject) => {
    fuse.mount(root, {

    },
    (err) => {
      if (err) reject(err)
      else resolve()
    })
  });

  const unmountAsync = () => {

  }

  await mountAsync()

  try {
    await done
  } finally {
    await unmountAsync()
  }
}

