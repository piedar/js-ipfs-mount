import Fuse = require("fuse-native")
import type { IPFS } from "ipfs-core-types"
import type { Segment } from "types/ipfs-api"
const debug = require("debug")("MfsMountable")

import { errorToFuseCode } from "./errors"
import { gather, map } from "./iterable"

// some code based on https://github.com/tableflip/ipfs-fuse


export function MfsMount(
  ipfs: IPFS,
  reader: MfsReader = MfsReader_Direct(ipfs),
  writer: MfsWriter = MfsWriter_Direct(ipfs),
): Fuse.Handlers {
  const start = Date.now()

  return {
    create (path, mode, reply) {
      debug("create", { path, mode })

      // todo: ipfs 0.4.22 replies 404?
      /*
      ipfs.files.touch(path, { flush: true })
        .then(() => ipfs.files.chmod(path, mode, { flush: true }))
        .then(() => reply(0))
        .catch((err) => {
          debug("create failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
        */

      ipfs.files.write(path, Buffer.alloc(0), { offset: 0, length: 0, create: true })
        .then(() => reply(0))
        .catch((err) => {
          debug("write failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
    },

    ftruncate (path, fd, size, reply) {
      debug("ftruncate", { path, fd, size })

      async function getBuffer() {
        const buffer = Buffer.alloc(size)
        if (size > 0) {
          await reader.read(path, buffer, { offset: 0, length: size })
        }
        return buffer
      }

      getBuffer()
        .then(buffer => ipfs.files.write(path, buffer, { truncate: true }))
        .then(() => reply(0))
        .catch((err) => {
          debug("truncate failed", { err })
          return reply(errorToFuseCode(err))
        })
    },

    mkdir (path, mode, reply) {
      debug("mkdir", { path, mode })

      ipfs.files.mkdir(path, { mode })
        .then(() => reply(0))
        .catch((err) => {
          debug("mkdir failed", { err })
          return reply(Fuse.EREMOTEIO)
      })
    },

    mknod (path, mode, dev, reply) {
      debug("mknod", { path, mode, dev })
      reply(Fuse.EOPNOTSUPP) // can't make block or character special files in ipfs
    },

    open (path, flags, reply) {
      debug("open", { path, flags })
      reply(0, 0) // todo: real fd
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

      reader.read(path, buffer, { offset, length })
        .then(result => reply(result.length))
        .catch(bail)
    },

    readdir (path, reply) {
      debug("readdir", { path })

      gather(map(ipfs.files.ls(path), f => f.name))
        .then(names => reply(0, names))
        .catch(err => {
          debug("ls failed", { err })
          return reply(Fuse.EREMOTEIO, undefined!)
        })
    },

    rename (src, dest, reply) {
      debug("rename", { src, dest })

      // todo: look into parent option
      ipfs.files.mv(src, dest)
        .then(() => reply(0))
        .catch((err) => {
          debug("mv failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
    },

    rmdir (path, reply) {
      debug("rmdir", { path })

      // todo: does recursive match the semantics of rmdir?
      ipfs.files.rm(path, { recursive: true })
        .then(() => reply(0))
        .catch(err => {
          debug("rm failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
    },

    statfs (path, reply) {
      debug("statfs", { path })

      ipfs.repo.stat()
        .then(stat => {
          // todo: this needs a lot of work
          // https://github.com/mafintosh/fuse-bindings#opsstatfspath-cb
          // https://github.com/mafintosh/fuse-bindings/blob/032ed16e234f7379fbf421c12afef592ab2a292d/fuse-bindings.cc#L771-L783
          // http://man7.org/linux/man-pages/man2/statfs.2.html
          const data = {
            bsize: 8, // todo: Because 8 bits in a byte right?
            frsize: 0, // todo: No idea...
            blocks: Number.isSafeInteger(Number(stat.repoSize))
              ? Number(stat.repoSize) // todo: have to reply with int32
              : Number.MAX_SAFE_INTEGER, // If blocks are bytes?
            bfree: Number.isSafeInteger(Number(stat.storageMax) - Number(stat.repoSize))
              ? Number(stat.storageMax) - Number(stat.repoSize) // todo: have to reply with int32
              : Number.MAX_SAFE_INTEGER, // todo: because blocks are bytes?
            bavail: Number.isSafeInteger(Number(stat.storageMax) - Number(stat.repoSize))
              ? Number(stat.storageMax) - Number(stat.repoSize) // todo: have to reply with int32
              : Number.MAX_SAFE_INTEGER, // todo: because blocks are bytes?
            files: Number.isSafeInteger(Number(stat.numObjects))
              ? Number(stat.numObjects) // todo: have to reply with int32
              : Number.MAX_SAFE_INTEGER,
            ffree: Number.MAX_SAFE_INTEGER, // todo: no idea how to work this out
            favail: Number.MAX_SAFE_INTEGER, // todo: no idea how to work this out
            fsid: 0, // todo: WHAT IS?
            flag: 0, // todo: does fuse know this?
            namemax: Number.MAX_SAFE_INTEGER // todo: get from OS?
          }

          debug({ data })
          reply(0, data)
        })
        .catch(err => {
            debug("stat failed", { err })
            return reply(Fuse.EREMOTEIO, undefined!)
        })
    },

    unlink (path, reply) {
      debug("unlink", { path })

      ipfs.files.rm(path)
        .then(() => reply(0))
        .catch(err => {
          debug("rm failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
    },

    utimens (path, atime, mtime, reply) {
      debug("utimens", { path, atime, mtime })

      ipfs.files.stat(path)
        .then(stat => {
          return reply(Fuse.EOPNOTSUPP)
        })
        .catch(err => {
          if (err.message === 'file does not exist') {
            return reply(Fuse.ENOENT)

            // todo: should it really create a file if does not exist?
            /*
            ipfs.files.write(path, Buffer.from(''), { create: true }, (err) => {
              if (err) {
                err = explain(err, 'Failed to create file')
                debug(err)
                return reply(Fuse.EREMOTEIO)
              }
              reply(0)
            })
            */
          }
        })
    },

    chown (path: string, uid: number, gid: number, cb: (err: number) => void) {
      debug("chown" + path, { path, uid, gid })
      debug("fixme: chown does nothing")
      return cb(0)
    },

    chmod (path: string, mode: any, cb: (err: number) => void) {
      debug("chmod", { path, mode })
      debug("fixme: chmod does nothing")
      return cb(0)
    },

    getattr (path: string, reply: (err: number, stats: Fuse.Stats) => void) {
      debug("getattr", { path })

      ipfs.files.stat(path)
        .then(ipfsStat => {
          // blksize is vital for write performance
          // todo: wget and curl max out at 8192?

          // todo: mtime, atime, ctime are wrong
          // might get weird results when using auto_cache
          const now = Date.now()

          reply(0, {
            blksize: 256 * 1024,

            mtime: now,
            atime: now,
            ctime: now,
            nlink: 1,
            size: ipfsStat.size,
            // https://github.com/TooTallNate/stat-mode/blob/master/index.js
            mode: ipfsStat.type === 'directory' ? 16877 : 33188,
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0
          } as any)
        })
        .catch(err => {
          debug("stat failed", { err })
          return reply(errorToFuseCode(err), undefined!)
        })
    },

    write (path, fd, buf, len, pos, reply) {
      debug("write", { path, fd, len, pos })

      writer.write(path, buf, { offset: pos, length: len })
        .then(() => reply(len))
        .catch((err: any) => {
          debug({ err })
          reply(Fuse.EREMOTEIO)
        })
    },

    flush (path, fd, datasync, reply) {
      debug("flush", { path, fd })

      writer.flush(path)
        .then(() => reply(0))
        .catch(err => {
          debug({ err })
          reply(errorToFuseCode(err))
        })
    },
  }
}


type MfsReader = {
  read: (path: string, buffer: Buffer, segment: Segment) => Promise<Segment>
}

export function MfsReader_Direct(ipfs: IPFS): MfsReader {
  return {
    async read (path, buffer, segment) {
      let targetOffset = 0
      for await (const chunk of ipfs.files.read(path, segment)) {
        debug("read chunk", { length: chunk.length })
        const targetEnd = targetOffset + chunk.length
        if (targetEnd > segment.length) {
          // todo: is this check still necessary?
          throw { message: "ipfs.files.read() returned a bad segment", segment, targetEnd }
        }
        buffer.fill(chunk, targetOffset, targetEnd)
        targetOffset = targetEnd
      }
      return { offset: segment.offset, length: targetOffset }
    }
  }
}


type MfsWriter = {
  write: (path: string, buffer: Buffer, segment: Segment) => Promise<void>
  flush: (path: string) => Promise<void>
}

export function MfsWriter_Direct(ipfs: IPFS): MfsWriter {
  return {
    write: (path: string, buffer: Buffer, segment: Segment) => {
      return ipfs.files.write(path, buffer, { ...segment })
    },
    flush: async (path: string) => {
      await ipfs.files.flush(path)
    }
  }
}
