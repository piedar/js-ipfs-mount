import { expect } from "chai"
import * as mocha from "mocha"
import { IpfsReader, IpfsReader_Direct, IpfsReader_ReadStream } from "./ipfs-read"
const IpfsApi = require("ipfs-api")


type TestCase = {
  readonly path: string,
  readonly description: string,
  readonly expectedBuffer: Readonly<Buffer>,
}

const testCases: TestCase[] = [
  {
    path: "/ipfs/QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH",
    description: "empty",
    expectedBuffer: new Buffer(0),
  },
  {
    path: "/ipfs/QmZULkCELmmk5XNfCgTnCyFgAVxBRBXyDHGGMVoLFLiXEN",
    description: "hello",
    expectedBuffer: new Buffer("hello\n"),
  },
]


const ipfs = new IpfsApi()
const readers = [
  { name: "IpfsReader_Direct", reader: IpfsReader_Direct(ipfs) },
  { name: "IpfsReader_ReadStream", reader: IpfsReader_ReadStream(ipfs) },
]

for (const { name, reader } of readers) {
  describe(name, () => {
    for (const testCase of testCases) {
      it(testCase.description, async () => {
        // use longer buffer to test for overflow
        const buffer = new Buffer(testCase.expectedBuffer.byteLength + 4)
        const segment = { offset: 0, length: buffer.byteLength }
        const result = await reader.read(testCase.path, buffer, segment)

        expect(result.offset).to.deep.equal(segment.offset)

        const actual = buffer.slice(0, result.length)
        expect(actual).to.deep.equal(testCase.expectedBuffer)

        const leftover = buffer.slice(result.length)
        expect(leftover).to.deep.equal(new Buffer(leftover.byteLength), "overflow into empty bytes!")
      })
    }
  })
}
