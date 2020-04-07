
declare module IpfsApi {
  //import { Readable, Writable } from "stream"

  type Segment = {
    offset: number
    length: number
  }

  type Options = {
    host?: string
    port?: string
    protocol?: string
    headers?: object
  }

  type FileListing = {
    depth: number,
    name: string,
    path: string,
    size: number,
    hash: string,
    type: "file" | "directory",
  }

  type IpfsClient = {
    // todo: non-promise overloads
    ls(path: string): Promise<IpfsApi.FileListing[]>
    cat(path: string, segment: IpfsApi.Segment): Promise<Buffer>
    catReadableStream(path: string, segment: IpfsApi.Segment): any // todo: this actually returns Readable, but I can't get the import to work

    // todo: incomplete
    files: {
      mkdir: (
        path: string,
        options?: { parents?: false | boolean, format?: "dag-pb" | string, hashAlg?: "sha2-256" | string, flush?: true | boolean },
      ) => Promise<void>,
      stat: (path: string) => Promise<any>,
      rm: (
        path: string,
        options?: { recursive?: false | boolean },
      ) => Promise<void>,
      ls: (path: string) => AsyncIterable<any>,
      mv: (from: string, to: string, options?: { parents?: false | boolean, hashAlg?: "sha2-256" | string, flush?: true | boolean }) => Promise<void>,
      read: (
        path: string,
        segment: IpfsApi.Segment,
      ) => Promise<Buffer>,
      write: (
        path: string,
        buffer: Buffer,
        options: { offset: number, length: number, flush: boolean },
      ) => Promise<void>,
      flush: (path: string) => Promise<void>,
    },

    // todo: incomplete
    repo: {
      stat(options?: { human?: boolean }): Promise<{ numObjects: BigInt, repoSize: BigInt, repoPath: string, version: string, storageMax: BigInt }>,
    },
  }
}

declare module "ipfs-http-client" {
  /// const ipfs = IpfsClient("/ip4/127.0.0.1/tcp/5001")
  function constructor(multiadrr?: string): IpfsApi.IpfsClient

  /// const ipfs = IpfsClient("localhost", "5001")
  function constructor(host?: string, port?: string, opts?: IpfsApi.Options): IpfsApi.IpfsClient

  /// const ipfs = IpfsClient({ host: "localhost", port: "5001", protocol: "http" })
  function constructor(options?: IpfsApi.Options): IpfsApi.IpfsClient

  export = constructor
}
