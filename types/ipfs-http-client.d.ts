import { IpfsClient } from "ipfs-api"


type Options = {
  host?: string
  port?: string
  protocol?: string
  headers?: object
}

/// const ipfs = IpfsClient("/ip4/127.0.0.1/tcp/5001")
declare function constructor(multiadrr?: string): IpfsClient

/// const ipfs = IpfsClient("localhost", "5001")
declare function constructor(host?: string, port?: string, opts?: Options): IpfsClient

/// const ipfs = IpfsClient({ host: "localhost", port: "5001", protocol: "http" })
declare function constructor(options?: Options): IpfsClient

export = constructor
