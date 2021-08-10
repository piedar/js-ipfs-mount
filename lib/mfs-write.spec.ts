import * as fs from "fs"
import * as path from "path"
import { Buffer } from "buffer"
import * as IpfsHttpClient from "ipfs-http-client"
import { expect } from "chai"
import { describe, it } from "mocha"
import { v4 as uuidv4 } from "uuid"
import { MfsReader_Direct, MfsWriter_Direct } from "./mfs-mount";


function fileTest(expectedFile: string) {
  return {
    name: path.parse(expectedFile).base,
    expectedBuffer: fs.promises.readFile(expectedFile).catch(err => { console.error(err); return undefined; }),
  }
}

const testCases = [
  {
    name: "hello",
    expectedBuffer: Buffer.from("hello\n"),
  },
  fileTest("/var/cache/distfiles/go-ipfs-0.9.1.tar.gz"),
  fileTest("/var/cache/distfiles/bash-5.1.tar.gz"),
]


const ipfs = IpfsHttpClient.create()

describe(`${MfsReader_Direct.name} + ${MfsWriter_Direct.name}`, () => {
  const reader = MfsReader_Direct(ipfs)
  const writer = MfsWriter_Direct(ipfs)

  for (const testCase of testCases) {
    it(testCase.name, async function(this) {
      const expectedBuffer = await testCase.expectedBuffer
        if (!expectedBuffer) {
          this.skip()
          return
        }

      const tmpDir = `/.test-${uuidv4()}`
      await ipfs.files.mkdir(tmpDir)

      try {
        const mfsPath = path.join(tmpDir, testCase.name)
        const segment = { offset: 0, length: expectedBuffer.byteLength }

        // cheekily injecting extra options
        const writeOptions = { ...segment, create: true, }
        await writer.write(mfsPath, expectedBuffer, writeOptions)

        const resultBuffer = Buffer.alloc(segment.length)
        const result = await reader.read(mfsPath, resultBuffer, segment)
        expect(segment).to.deep.include(result)
        expect(resultBuffer).to.deep.equal(expectedBuffer)
      }
      finally {
        await ipfs.files.rm(tmpDir, { recursive: true })
      }
    }).timeout(40_000)
  }
})
