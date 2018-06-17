import { Readable, Writable, PassThrough } from "stream"
const debug = require("debug")("MfsWriter")
const IpfsApi = require("ipfs-api")


export type MfsWriter = {
  write: (path: string, buffer: Buffer, offset: number, count: number) => Promise<void>
  flush: (path: string) => Promise<void>
}

export function MfsWriter_Direct(ipfs: typeof IpfsApi): MfsWriter {
  return {
    write: (path: string, buffer: Buffer, offset: number, count: number) => {
      return ipfs.files.write(path, buffer, { offset: offset, count: count, flush: false })
    },
    flush: (path: string) => {
      return ipfs.files.flush(path)
    }
  }
}

export function MfsWriter_WriteThrough(ipfs: typeof IpfsApi): MfsWriter {
  type StreamContext = {
    offset: number,
    stream: PassThrough,
  }
  const streamsByPath = new Map<string, StreamContext>()

  return {
    async write(path: string, buffer: Buffer, offset: number, count: number) {
      let ctx = streamsByPath.get(path)
      if (!ctx) {
        ctx = {
          offset: offset,
          stream: new PassThrough(),
        }
        streamsByPath.set(path, ctx)
        ipfs.files.write(path, ctx.stream, { offset: ctx.offset, flush: false })
      }

      if (ctx.offset !== offset) {
        debug("offset mismatch; flushing")

        streamsByPath.delete(path)
        await new Promise((resolve, reject) => {
          ctx!.stream.end(() => resolve())
        })
        return this.write(path, buffer, offset, count)
      }

      ctx.offset += buffer.byteLength
      debug("writethrough append", { newOffset: ctx.offset })
      ctx.stream.write(buffer)
    },

    flush: async (path: string) => {
      const ctx = streamsByPath.get(path)
      if (ctx) {
        streamsByPath.delete(path)
        await new Promise((resolve, reject) => {
          ctx.stream.end(() => resolve())
        })
      }
      await ipfs.files.flush(path)
    }
  }
}
