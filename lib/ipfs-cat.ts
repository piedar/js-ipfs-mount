import { Readable, Writable } from "readable-stream"
const IpfsApi = require("ipfs-api")
const debug = require("debug")("IpfsMount")


type CatResult = {
  bytesCopied: number
}

type Segment = {
  offset: number
  length: number
}


export const ipfsCat = ipfsCat_File

export async function ipfsCat_File(ipfs: typeof IpfsApi, ipfsPath: string, buffer: Buffer, segment: Segment):
  Promise<CatResult>
{
  const file: Buffer = await ipfs.cat(ipfsPath, segment);

  let fileOffset = 0
  if (file.byteLength > segment.length) {
    debug("fixme: ipfs.cat() ignored ", { segment }, " and returned ", { offset: 0, length: file.byteLength })
    fileOffset = segment.offset
  }

  const bytesCopied = file.copy(buffer, 0, fileOffset, fileOffset + segment.length)
  return { bytesCopied }
}

export async function ipfsCat_ReadStream(ipfs: typeof IpfsApi, ipfsPath: string, buffer: Buffer, segment: Segment):
  Promise<CatResult>
{
  let position = 0
  const stream: Readable = ipfs.catReadableStream(ipfsPath, segment);

  if (stream.readableLength !== segment.length) {
    debug("fixme: ipfs.catReadableStream() ignored ", { segment }, " and returned ", { offset: 0, length: stream.readableLength })
  }

  stream.on("data", chunk => {
    debug({ chunk, chunkLength: chunk.length, position, capacity: buffer.byteLength })

    if (position >= segment.length) {
      // Calling stream.destroy() directly causes "Error: write after end".
      debug("destroying stream")
      Promise.resolve()
        .then(() => stream.destroy())
        .catch(debug)
      return
    }

    let bytesWritten: number

    if (typeof chunk === "string") {
      bytesWritten = buffer.write(chunk, position)
    }
    else {
      bytesWritten = chunk.copy(buffer, position, 0, segment.length - position)
    }

    debug({ bytesWritten })
    if (bytesWritten != chunk.length) debug("UH OH")

    position += bytesWritten
  })

  const streamEnd = () => new Promise((resolve, reject) => {
    stream.on("end", resolve)
    stream.on("error", reject)
  })

  await streamEnd();
  debug({ length: segment.length, position })
  return { bytesCopied: position }
}
