import * as fs from "fs"
import * as path from "path"
import { Buffer } from "buffer"
import * as IpfsHttpClient from "ipfs-http-client"
import { expect } from "chai"
import { describe, it } from "mocha"
import { IpfsReader, IpfsReader_Direct } from "./ipfs-read"


type TestCase = {
  readonly name: string,
  readonly ipfsPath: string,
  readonly offset?: number,
  readonly expectedBuffer: Readonly<Buffer> | Promise<Readonly<Buffer> | undefined>,
}

function withOffset(source: TestCase, offset: number): TestCase {
  return {
    name: `${source.name} + ${offset}`,
    ipfsPath: source.ipfsPath,
    offset: (source.offset || 0) + offset,
    expectedBuffer: Promise.resolve(source.expectedBuffer).then(buffer => buffer && buffer.slice(offset))
  }
}

function shouldMatch(expectedFile: string, ipfsPath: string): TestCase {
  return {
    name: path.parse(expectedFile).base,
    ipfsPath: ipfsPath,
    expectedBuffer: fs.promises.readFile(expectedFile).catch(err => { console.error(err); return undefined; }),
  }
}

const rawTestCases: TestCase[] = [
  {
    name: "empty",
    ipfsPath: "/ipfs/QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH",
    expectedBuffer: Buffer.of(),
  },
  {
    name: "hello",
    ipfsPath: "/ipfs/QmZULkCELmmk5XNfCgTnCyFgAVxBRBXyDHGGMVoLFLiXEN",
    expectedBuffer: Buffer.from("hello\n"),
  },

  shouldMatch("/var/cache/distfiles/go-ipfs-0.9.1.tar.gz", "/ipfs/QmUVYEkMcw51Fdn6LNsArP1SWZtnd3NCamULTwJAc9cXiH"),
  shouldMatch("/var/cache/distfiles/bash-5.1.tar.gz", "/ipfs/QmaKCo5bzwPzv373WRNUhkYumPamDKERLSUS9EydSVBgwM"),
  shouldMatch("/usr/share/wesnoth/data/core/music/silence.ogg", "/ipfs/QmXNJ8c1UJsMSza5zGXFp31ZxTiXwDajgA94Qusg7dCPZX"),
  shouldMatch("/usr/share/wesnoth/data/core/music/battle.ogg", "/ipfs/QmQdktw4UY5oVYBuErqiABCSyuMa5qjRF6buFRzaQfUbq4"),
]

const testCases = rawTestCases
  .concat(rawTestCases.map(tc => withOffset(tc, 1)))
  .concat(rawTestCases.map(tc => withOffset(tc, 4096)))
  .sort((a, b) => a.name.localeCompare(b.name))


const ipfs = IpfsHttpClient.create()
const readers = [
  { name: IpfsReader_Direct.name, reader: IpfsReader_Direct(ipfs) },
]

for (const { name, reader } of readers) {
  describe(name, () => {
    for (const testCase of testCases) {
      it(testCase.name, async function (this) {
        const expectedBuffer = await testCase.expectedBuffer
        if (!expectedBuffer) {
          this.skip()
          return
        }

        // use longer buffer to test for overflow
        const buffer = Buffer.alloc(expectedBuffer.byteLength + 4)
        const segment = { offset: testCase.offset || 0, length: buffer.byteLength }
        const result = await reader.read(testCase.ipfsPath, buffer, segment)

        expect(result.offset).to.deep.equal(segment.offset)

        const actual = buffer.slice(0, result.length)
        expect(actual).to.deep.equal(expectedBuffer)

        const leftover = buffer.slice(result.length)
        expect(leftover).to.deep.equal(Buffer.alloc(leftover.byteLength), "overflow into empty bytes!")
      }).timeout(5_000)
    }
  })
}
