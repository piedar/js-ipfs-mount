
type PeerIdOptions = {
  bits?: number;
}

type PeerIdJSON = {
  id: string;
  privKey: string;
  pubKey: string;
}

// todo
type RsaPrivateKey = any;
type RsaPublicKey = any;

declare module "peer-id" {
  class PeerId {
    constructor(id: Buffer, privKey?: RsaPrivateKey, pubKey?: RsaPublicKey);

    readonly id: Buffer;
    readonly privKey?: RsaPrivateKey;
    readonly pubKey?: RsaPublicKey;

    marshalPubKey(): any | undefined;
    marshalPrivKey(): any | undefined;
    toPrint(): any;
    toJSON(): PeerIdJSON;
    toHexString(): string;
    toBytes(): Buffer;
    toB58String(): string;
    isEqual(id: Buffer | PeerId): boolean;
    isValid(callback: (err: Error | null) => void): void;

    static create(opts: PeerIdOptions, callback: (err: Error | null, peerId: PeerId | undefined) => void): void;
    static create(callback: (err: Error | null, peerId: PeerId | null | undefined) => void): void;
    static createFromHexString(str: string): PeerId;
    static crateFromBytes(buf: Buffer): PeerId;
    static createFromB58String(str: string): PeerId;
    static createFromPubKey(key: RsaPublicKey, callback: (err: Error | null, peerId: PeerId | undefined) => void): void;
    static createFromPrivKey(key: RsaPrivateKey, callback: (err: Error | null, peerId: PeerId | undefined) => void): void;
    static createFromJSON(json: PeerIdJSON, callback: (err: Error | null, peerId: PeerId | undefined) => void): void;
    static isPeerId(peerId: any): peerId is PeerId;
  }

  export = PeerId;
}
