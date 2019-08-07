import { endOf } from "./extensions"
import { Readable } from "stream";
const debug = require("debug")("IpfsMount")


export type IpfsReader = {
  read: (path: string, buffer: Buffer, segment: IpfsApi.Segment) => Promise<IpfsApi.Segment>
}

export function IpfsReader_Direct(ipfs: IpfsApi.IpfsClient): IpfsReader {
  return {
    read: async (path, buffer, segment) => {
      const file = await ipfs.cat(path, segment);

      let fileOffset = 0
      if (file.byteLength > segment.length) {
        debug("fixme: ipfs.cat() ignored ", { segment }, " and returned ", { offset: 0, length: file.byteLength })
        fileOffset = segment.offset
      }

      const bytesCopied = file.copy(buffer, 0, fileOffset, fileOffset + segment.length)
      return { offset: segment.offset, length: bytesCopied }
    }
  }
}

export function IpfsReader_ReadStream(ipfs: IpfsApi.IpfsClient): IpfsReader {
  return {
    read: async (path, buffer, segment) => {
      let position = 0
      const stream: Readable = ipfs.catReadableStream(path, segment)

      if (stream.readableLength !== segment.length) {
        debug("fixme: ipfs.catReadableStream() ignored ", { segment }, " and returned ", { offset: 0, length: stream.readableLength })
      }

      stream.on("data", chunk => {
        debug("read stream", { length: chunk.length, position, capacity: buffer.byteLength })

        if (position >= segment.length) {
          // Calling stream.destroy() directly causes "Error: write after end".
          debug("destroying stream")
          Promise.resolve()
            .then(() => stream.destroy())
            .catch(debug)
          return
        }

        const bytesWritten = typeof chunk === "string" ? buffer.write(chunk, position)
                           : chunk.copy(buffer, position, 0, segment.length - position)

        if (bytesWritten !== chunk.length) {
          debug("fixme: bytesWritten mismatch", { bytesWritten, chunkLength: chunk.length })
        }

        position += bytesWritten
      })

      await endOf(stream);
      debug("end of stream", { length: segment.length, position })
      return { offset: segment.offset, length: position }
    }
  }
}
