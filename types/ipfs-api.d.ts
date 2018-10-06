
declare module "ipfs-api" {
  import { Readable, Writable } from "readable-stream"

  module IpfsApi {
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
   }

  class IpfsApi {
    /// const ipfs = new IpfsApi("/ip4/127.0.0.1/tcp/5001")
    constructor(multiadrr?: string)

    /// const ipfs = new IpfsApi("localhost", "5001")
    constructor(host?: string, port?: string, opts?: IpfsApi.Options)

    /// const ipfs = new IpfsApi({ host: "localhost", port: "5001", protocol: "http" })
    constructor(options?: IpfsApi.Options)

    // todo: non-promise overloads
    ls(path: string): Promise<IpfsApi.FileListing[]>
    cat(path: string, segment: IpfsApi.Segment): Promise<Buffer>
    catReadableStream(path: string, segment: IpfsApi.Segment): Readable

    // todo
    files: any
  }

  export = IpfsApi
}
