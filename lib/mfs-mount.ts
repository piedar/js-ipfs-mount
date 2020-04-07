import Fuse = require("fuse-native")
const debug = require("debug")("MfsMountable")


// some code based on https://github.com/tableflip/ipfs-fuse

function errorToCode(err: any): number {
  return typeof err === "number" ? err
       : err instanceof Error && err.message === "file does not exist" ? Fuse.ENOENT
       : err instanceof Error && err.message === "path must contain at least one component" ? Fuse.EPERM
       : -1;
}

export function MfsMount(
  ipfs: IpfsApi.IpfsClient,
  reader: MfsReader = MfsReader_Direct(ipfs),
  writer: MfsWriter = MfsWriter_Direct(ipfs),
): Fuse.Handlers {
  const start = Date.now()

  return {
    create (path, mode, reply) {
      debug("create", { path, mode })

      writer.write(path, Buffer.from(''), { offset: 0, length: 0 })
        .then(() => reply(0))
        .catch((err) => {
          debug("write failed", { err })
          return reply(Fuse.EREMOTEIO)
        })
    },

    ftruncate (path, fd, size, reply) {
      debug("ftruncate", { path, fd, size })

      // todo: check ipfs truncate support
      /*
      if (size === 0) {
        ipfs.files.write(path, Buffer.from(''), { truncate: true })
          .then(() => reply(0))
          .catch((err) => {
            debug("write failed", { err })
            return reply(fuse.EREMOTEIO)
          })
      } else {
        // todo: read size bytes then write with truncate true
      }
      */

      reply(Fuse.EOPNOTSUPP)
    },

    mkdir (path, mode, reply) {
      debug("mkdir", { path, mode })

      ipfs.files.mkdir(path)
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
      reply(0, 42) // todo: real fd
    },

    read: (path, fd, buffer, length, offset, cb) => {
      debug("read " + path, { offset, length })

      const reply = (bytesReadOrError: number) => {
        debug({ bytesReadOrError });
        cb(bytesReadOrError)
      }
      const bail = (err: any, reason?: any) => {
        debug({ err, reason });
        reply(errorToCode(err))
      }

      reader.read(path, buffer, { offset, length })
        .then(result => reply(result.length))
        .catch(bail)
    },

    readdir (path, reply) {
      debug("readdir", { path })

      async function gatherFileNames() {
        const allNames = new Array<string>()
        for await (const file of ipfs.files.ls(path)) {
          allNames.push(file.name || file.hash)
        }
        return allNames
      }

      gatherFileNames()
        .then(names => reply(0, names))
        .catch(err => {
          debug("ls failed", { err })
          return reply(Fuse.EREMOTEIO, undefined!)
        })
    },

    rename (src, dest, reply) {
      debug("rename", { src, dest })

      // todo: look into options
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

    chown: (path: string, uid: number, gid: number, cb: (err: number) => void) => {
      debug("custom chown " + path, { uid, gid, cb })
      debug("fixme: chown does nothing")
      return cb(0)
    },

    chmod: (path: string, mode: any, cb: (err: number) => void) => {
      debug("custom chmod " + path, { mode, cb })
      debug("fixme: chmod does nothing")
      return cb(0)
    },

    getattr: (path: string, cb: (err: number, stats: Fuse.Stats) => void) => {
      debug("custom getattr " + path)

      const reply = (stats: Fuse.Stats) => {
        debug(stats)
        return cb(0, stats)
      }
      const bail = (err: number, message?: any) => {
        debug({ err, message })
        return cb(err, undefined!)
      }

      ipfs.files.stat(path)
        .then((ipfsStat: any) => {
          // blksize is vital for write performance
          // todo: wget and curl max out at 8192?

          // todo: mtime, atime, ctime are wrong
          // might get weird results when using auto_cache
          const now = Date.now()

          reply({
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
        .catch((err: any) => {
          const errno = err && err.message === 'file does not exist' ? Fuse.ENOENT
                      : Fuse.EREMOTEIO;
          return bail(errno, err)
        })
    },

    write: (path, fd, buf, len, pos, reply) => {
      debug("write", { path, len, pos })

      writer.write(path, buf, { offset: pos, length: len })
        .then(() => reply(len))
        .catch((err: any) => {
          debug({ err })
          reply(Fuse.EREMOTEIO)
        })
    },

    flush: (path, fd, reply) => {
      debug("flush", { path })

      writer.flush(path)
        .then(() => reply(0))
        .catch((err: any) => {
          debug({ err })
          reply(Fuse.EREMOTEIO)
        })
    }
  }
}


type MfsReader = {
  read: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => Promise<IpfsApi.Segment>
}

export function MfsReader_Direct(ipfs: IpfsApi.IpfsClient): MfsReader {
  return {
    read: async (path, buffer, segment) => {
      const chunk = await ipfs.files.read(path, segment)

      let fileOffset = 0
      if (chunk.byteLength > segment.length) {
        debug("fixme: ipfs.cat() ignored ", { segment }, " and returned ", { offset: 0, length: chunk.byteLength })
        fileOffset = segment.offset
      }

      const bytesCopied = chunk.copy(buffer, 0, fileOffset, fileOffset + segment.length)
      return { offset: segment.offset, length: bytesCopied }
    },
  }
}


type MfsWriter = {
  write: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => Promise<void>
  flush: (path: string) => Promise<void>
}

export function MfsWriter_Direct(ipfs: IpfsApi.IpfsClient): MfsWriter {
  return {
    write: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => {
      return ipfs.files.write(path, buffer, { ...segment, flush: false })
    },
    flush: (path: string) => {
      return ipfs.files.flush(path)
    }
  }
}
