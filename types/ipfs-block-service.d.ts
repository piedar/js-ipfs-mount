
declare module "ipfs-block-service" {
  import CID = require("cids");
  import Block = require("ipfs-block");
  import IpfsRepo = require("ipfs-repo");
  import Bitswap = require("ipfs-bitswap");

  class BlockService {
    constructor(repo: IpfsRepo);
    setExchange(bitswap: Bitswap): void;
    unsetExchange(): void;
    put(block: Block, callback: (err: Error | null) => void): void;
    putMany(blocks: Block[], callback: (err: Error | null, block: Block) => void): void;
    delete(cid: CID, callback: (err: Error | null) => void): void;
  }

  export = BlockService;
}
