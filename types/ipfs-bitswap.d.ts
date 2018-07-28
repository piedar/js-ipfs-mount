
interface BitswapOptions {
  statsEnabled: boolean;
  statsComputeThrottleTimeout: number;
  statsComputeThrottleMaxQueueSize: number;
}

// todo
type Libp2p = any;
type Blockstore = any;
type Wantlist = any;
type WantlistEntry = any;

declare module "ipfs-bitswap" {
  import CID = require("cids");
  import Block = require("ipfs-block");
  import PeerId = require("peer-id");

  class Bitswap {
    constructor(libp2p: Libp2p, blockstore: Blockstore, options?: BitswapOptions);

    readonly peerInfo: any;
    
    enableStats(): void;
    distableStats(): void;
    wantlistForPeer(peerId: PeerId): Wantlist;
    get(cid: CID, callback: (err: Error | null, block: Block) => void): void;
    getMany(cids: CID[], callback: (err: Error | null, block: Block | undefined) => void): void;
    unwant(cids: CID | CID[]): void;
    put(block: Block, callback: (err?: Error | null) => void): void;
    putMany(blocks: Block[], callback: (err?: Error | null) => void): void;
    getWantlist(): Iterator<WantlistEntry>;
    peers(): PeerId[];
    stat(): any;
    start(callback: (err: Error | null) => void): void;
    stop(callback: (err: Error | null) => void): void;
  }

  export = Bitswap;
}
