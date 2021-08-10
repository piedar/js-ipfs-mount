import * as fs from "fs"
import { join } from "path"
import * as Fuse from "fuse-native"
import type { IPFS } from "ipfs-core-types"
const debug = require("debug")("IpfsMount")

import { errorToFuseCode } from "./errors"
import { getOrAdd } from "./extensions"
import { filter, gather, map } from "./iterable"
import { IpfsReader, IpfsReader_Direct } from "./ipfs-read"

export function IpfsMount(
  ipfs: IPFS,
  reader: IpfsReader = IpfsReader_Direct(ipfs),
): Fuse.Handlers {

  const firstAccessByPath = new Map<string, Date>()

  return {
    create (path, mode, reply) {
      debug("create", { path, mode })
      reply(Fuse.EROFS)
    },

    open (path, flags, reply) {
      debug("open", { path, flags })
      return reply(0, 0)
    },

    opendir (path, flags, reply) {
      debug("opendir", { path, flags })
      if (path === "/") return reply(Fuse.EPERM, -1)
      return reply(0, -1)
    },

    //statfs (path, reply) {
    //  debug("statfs " + path)
    //},

    getattr (path, cb) {
      debug("getattr", { path })

      const reply = (code: number, stats: Fuse.Stats) => {
        debug({ code, stats })
        cb(code, stats)
      }
      const bail = (err: any, reason?: any) => {
        debug({ err, reason })
        cb(errorToFuseCode(err), undefined!)
      }

      if (path === "/") return bail(Fuse.EPERM)

      const ipfsPath = join("/ipfs", path)

      ipfs.files.stat(ipfsPath)
        .then(async ipfsStat => {
          debug({ ipfsStat })

          const now = new Date(Date.now())
          const firstAccess = getOrAdd(firstAccessByPath, path, now)

          const [filetype, permissions] =
            ipfsStat.type === "directory" ? [fs.constants.S_IFDIR, 0o111] :
            ipfsStat.type === "file"      ? [fs.constants.S_IFREG, 0o444] :
                                            [0, 0o000]

          const stats = {
            dev: 0,
            ino: 0,
            size: ipfsStat.size,
            mode: filetype | permissions,
            nlink: 1,
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0,
            rdev: 0,
            blksize: 0,
            blocks: ipfsStat.blocks,
            ctime: firstAccess,
            mtime: firstAccess,
            atime: now,
          }
          return reply(0, stats)
        })
        .catch((err: any) => bail(err, "ipfs files stat"))
    },

    readdir (path, cb) {
      debug("readdir " + path)

      const reply = (code: number, files: string[]) => {
        debug({ files });
        cb(code, files)
      }
      const bail = (err: any, reason?: any) => {
        debug({ err, reason });
        reply(errorToFuseCode(err), [])
      }

      const ipfsPath = path === "/" ? path : join("/ipfs", path)

      gather(
        map(
          filter(ipfs.ls(ipfsPath), file => file.depth === 1),
          file => file.name)
        )
        .then(names => reply(0, names))
        .catch((err: any) => bail(err, "ipfs ls"))
    },

    read (path, fd, buffer, length, offset, cb) {
      debug("read", { path, fd, length, offset })

      const reply = (bytesReadOrError: number) => {
        debug({ bytesReadOrError });
        cb(bytesReadOrError)
      }
      const bail = (err: any, reason?: any) => {
        debug({ err, reason });
        reply(errorToFuseCode(err))
      }

      if (path === "/") return bail(Fuse.EPERM)

      const ipfsPath = path.substring(1)

      reader.read(ipfsPath, buffer, { offset, length })
        .then(result => reply(result.length))
        .catch(bail)
    },
  }
}
