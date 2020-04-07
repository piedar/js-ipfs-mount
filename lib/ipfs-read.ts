import { IpfsClient, Segment } from "ipfs-api"
const debug = require("debug")("IpfsMount")


export type IpfsReader = {
  read: (path: string, buffer: Buffer, segment: Segment) => Promise<Segment>
}

export function IpfsReader_Direct(ipfs: IpfsClient): IpfsReader {
  return {
    async read (path, buffer, segment) {
      let targetOffset = 0
      for await (const chunk of ipfs.cat(path, segment)) {
        debug("read chunk", { length: chunk.length })
        const targetEnd = targetOffset + chunk.length
        if (targetEnd > segment.length) {
          // todo: is this check still necessary?
          throw { message: "ipfs.cat() returned a bad segment", segment, targetEnd }
        }
        targetOffset += chunk.copy(buffer, targetOffset)
      }
      return { offset: segment.offset, length: targetOffset }
    }
  }
}
