import * as fs from "fs"
import { expect } from "chai"
import { describe, it } from "mocha"
import { promisify } from "util"
import { IpfsReader, IpfsReader_Direct, IpfsReader_ReadStream } from "./ipfs-read"
const IpfsApi = require("ipfs-api")
const readFileAsync = promisify(fs.readFile)


type TestCase = {
  readonly name: string,
  readonly path: string,
  readonly expectedBuffer: Readonly<Buffer> | Promise<Readonly<Buffer>>,
}

const testCases: TestCase[] = [
  {
    name: "empty",
    path: "/ipfs/QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH",
    expectedBuffer: new Buffer(0),
  },
  {
    name: "hello",
    path: "/ipfs/QmZULkCELmmk5XNfCgTnCyFgAVxBRBXyDHGGMVoLFLiXEN",
    expectedBuffer: new Buffer("hello\n"),
  },
  {
    name: "vlc-2.2.8.tar.xz",
    path: "/ipfs/QmW6vbhabbRUHxfR98cnnDp1m5DjPCsvzZiowh4FbRZPAv",
    expectedBuffer: readFileAsync("/usr/portage/distfiles/vlc-2.2.8.tar.xz"),
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
      it(testCase.name, async () => {
        const expectedBuffer = await testCase.expectedBuffer

        // use longer buffer to test for overflow
        const buffer = new Buffer(expectedBuffer.byteLength + 4)
        const segment = { offset: 0, length: buffer.byteLength }
        const result = await reader.read(testCase.path, buffer, segment)

        expect(result.offset).to.deep.equal(segment.offset)

        const actual = buffer.slice(0, result.length)
        expect(actual).to.deep.equal(expectedBuffer)

        const leftover = buffer.slice(result.length)
        expect(leftover).to.deep.equal(new Buffer(leftover.byteLength), "overflow into empty bytes!")
      })
    }
  })
}
