import * as fs from "fs"
import * as path from "path"
import { promisify } from "util"
import IpfsClient = require("ipfs-http-client")
import { expect } from "chai"
import { describe, it } from "mocha"
import * as uuidv4 from "uuid/v4"
import { MfsReader_Direct, MfsWriter_Direct } from "./mfs-mount";
const readFileAsync = promisify(fs.readFile)


function fileTest(expectedFile: string) {
  return {
    name: path.parse(expectedFile).base,
    expectedBuffer: readFileAsync(expectedFile).catch(err => { console.error(err); return undefined; }),
  }
}

const testCases = [
  {
    name: "hello",
    expectedBuffer: new Buffer("hello\n"),
  },
  fileTest("/usr/portage/distfiles/vlc-3.0.4.tar.xz"),
  fileTest("/usr/portage/distfiles/warzone2100-3.2.3.tar.xz"),
]


const ipfs = IpfsClient()

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

        const resultBuffer = new Buffer(segment.length)
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
