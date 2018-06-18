import { Readable, Writable, PassThrough } from "readable-stream"
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
    lastWrite: Promise<any>,
    done: Promise<any>,
  }
  const streamsByPath = new Map<string, StreamContext>()

  return {
    write: async function thisWrite(path: string, buffer: Buffer, offset: number, count: number): Promise<void> {
      let ctx = streamsByPath.get(path)
      if (!ctx) {
        debug("starting new stream")

        ctx = {
          offset: offset,
          stream: new PassThrough(),
          lastWrite: Promise.resolve(),
          done: new Promise((resolve, reject) => { }),
        }
        streamsByPath.set(path, ctx)
        ctx.done = ipfs.files.write(path, ctx.stream, { offset: offset, flush: true })
      }

      if (ctx.offset !== offset) {
        debug("offset mismatch; flushing", { ctxOffset: ctx.offset, offset })

        streamsByPath.delete(path)
        await new Promise((resolve, reject) => {
          ctx!.stream.end(() => resolve())
        })
        return thisWrite(path, buffer, offset, count)
      }

      debug("writethrough append", { offset: ctx.offset })

      //ctx.stream.write(buffer, () => debug("finished write"))
      ctx.lastWrite = ctx.lastWrite.then(_ => new Promise((resolve, reject) => { ctx!.stream.write(buffer.slice(0, count), () => resolve(debug("finished write"))) }))
      await ctx.lastWrite
      ctx.offset += count
    },

    flush: async (path: string) => {
      const ctx = streamsByPath.get(path)

      debug("writethrough flush", { offset: ctx && ctx.offset })

      if (ctx) {
        streamsByPath.delete(path)
        await ctx.lastWrite
        await new Promise((resolve, reject) => {
          ctx.stream.end(() => resolve())
        })
        await ctx.done
      }

      // todo: this causes empty files?
      await ipfs.files.flush(path)
    }
  }
}
