import { expect } from "chai"
import * as mocha from "mocha"
import { ipfsCat } from "./ipfs-cat"
const IpfsApi = require("ipfs-api")


type TestCase = {
  readonly path: string,
  readonly description: string,
  readonly expectedBuffer: Readonly<Buffer>,
}

describe("ipfsCat", () => {
  const ipfs = new IpfsApi()

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

  for (const testCase of testCases) {
    it(testCase.description, async () => {
      // use longer buffer to test for overflow
      const buffer = new Buffer(testCase.expectedBuffer.byteLength + 4)
      const result = await ipfsCat(ipfs, testCase.path,
                                   buffer, { offset: 0, length: buffer.byteLength })

      const actual = buffer.slice(0, result.bytesCopied)
      expect(actual).to.deep.equal(testCase.expectedBuffer)

      const leftover = buffer.slice(result.bytesCopied)
      expect(leftover).to.deep.equal(new Buffer(leftover.byteLength), "overflow into empty bytes!")
    })
  }
})
