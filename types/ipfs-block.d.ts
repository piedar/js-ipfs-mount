
declare module "ipfs-block" {
  import CID = require("cids");

  class Block {
    constructor(data: Buffer, cid: CID);
    readonly data: Buffer;
    readonly cid: CID;

    static isBlock(block: any): block is Block;
  }

  export = Block;
}
