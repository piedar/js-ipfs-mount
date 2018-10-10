
type Callback<T> = (err: any | null, thing: T) => void;

type DAGNodeJson = {
  data: Buffer;
  multihash: string;
  size: number;
}

declare module "ipld-dag-pb" {
  class DAGNode {
    constructor(data: string | Buffer, links: DAGLink[], serialized: any, multihash: string | Buffer);

    toJSON(): DAGNodeJson;
    toString(): string;
    readonly data: Buffer;
    readonly links: any[];
    readonly serialized: any;
    readonly size: number;
    readonly multihash: Buffer;

    static create(data: string | Buffer, callback: Callback<DAGNode>): void;
    static create(data: string | Buffer, links: (DAGLink | string)[], callback: Callback<DAGNode>): void;
    static create(data: string | Buffer, links: (DAGLink | string)[], hashAlg: "sha2-256", callback: Callback<DAGNode>): void;
    static clone(node: DAGNode, callback: Callback<DAGNode>): void;
    static addLink(node: DAGNode, link: DAGLink | DAGNode, callback: Callback<DAGNode>): void;
    static rmLink(node: DAGNode, name: string, callback: Callback<DAGNode>): void;
    static rmLink(node: DAGNode, multihash: string | Buffer, callback: Callback<DAGNode>): void;
  }

  class DAGLink {
    constructor(name: string, size: number, multihash: string | Buffer);

    toJSON(): any;
    toString(): string;

    static create(name: string, size: number, multihash: string | Buffer, callback: Callback<DAGLink>): void;
  }
}
