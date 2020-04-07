import BigNumber from "bignumber.js"

type Segment = {
  offset: number
  length: number
}

type DateTime = {
  /** Number of seconds since the Unix Epoch (negative for before) */
  secs: number
  /** Number of nanoseconds since the last full second */
  nsecs: number
}

type AcceptedDate = Date | DateTime | [number, number]

type FileListing = {
  name: string
  path: string
  size: number
  //cid: CID // todo
  type: "file" | "directory"
  mode: number
  mtime: DateTime
}

type Stat = {
  //cid: CID // todo
  size: number
  cumulativeSize: number
  type: "file" | "directory"
  blocks: number
  withLocality: boolean
  local: boolean
  sizeLocal: number
}

type IpfsClient = {
  // todo: top-level incomplete
  cat(path: string, segment: Partial<Segment>): AsyncIterable<Buffer>
  ls(path: string): AsyncIterable<FileListing & { depth: number }>

  // see https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md
  files: {
    chmod(
      path: string,
      mode: string | number,
      options?: { recursive?: false | boolean, hashAlg?: "sha2-256" | string, flush?: true | boolean, cidVersion?: 0 | number },
    ): Promise<void>
    // todo: cp
    mkdir(
      path: string,
      options?: { parents?: false | boolean, hashAlg?: "sha2-256" | string, flush?: true | boolean, mode?: string | number, mtime?: AcceptedDate },
    ): Promise<void>
    stat(
      path: string,
      options?: { hash?: false | boolean, size?: false | boolean, withLocal?: false | boolean },
    ): Promise<Stat>
    touch(
      path: string,
      options?: { mtime?: AcceptedDate, hashAlg?: "sha2-256" | string, flush?: true | boolean, cidVersion?: 0 | number },
    ): Promise<void>
    rm(
      paths: string | string[],
      options?: { recursive?: false | boolean },
    ): Promise<void>
    read(
      path: string,
      segment: Partial<Segment>,
    ): AsyncIterable<Buffer>
    write(
      path: string,
      buffer: Buffer | AsyncIterable<Buffer>,
      options?: Partial<Segment> & {
        create?: false | boolean, truncate?: false | boolean, parents?: false | boolean,
        rawLeaves?: false | boolean, cidVersion?: 0 | number, mode?: number | string, mtime?: AcceptedDate
      },
    ): Promise<void>
    mv(
      from: string | string[],
      to: string,
      options?: { parents?: false | boolean, hashAlg?: "sha2-256" | string, flush?: true | boolean },
    ): Promise<void>
    flush(path?: string): Promise<void>
    ls(
      path?: string,
      options?: { sort?: false | boolean },
    ): AsyncIterable<FileListing>
  }

  // todo: incomplete
  // see https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/REPO.md
  repo: {
    stat(options?: { human?: boolean }): Promise<{ numObjects: BigNumber, repoSize: BigNumber, repoPath: string, version: string, storageMax: BigNumber }>,
  }
}
