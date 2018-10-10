
declare module "cids" {
  class CID {
    constructor(version: string | Buffer, codec: string, multihash: Buffer);
    constructor(cidStr: string);
    constructor(cidBuf: Buffer);
    constructor(multihash: Buffer);
    constructor(bs58Multihash: string);
    constructor(cid: CID);

    readonly codec: string;
    readonly version: number;
    readonly multihash: Buffer;

    readonly buffer: Buffer;
    readonly prefix: Buffer;
    toV0(): CID;
    toV1(): CID;
    toBaseEncodedString(base: 'base58btc' | string): string;
    toJSON(): { codec: string, version: number, multihash: Buffer };
    equals(other: CID): boolean;

    static isCID(other: any): boolean;
    static validateCID(other: CID): void;

    readonly codecs: any; // todo
  }

  export = CID;
}
