
type Closer = {
  close: (callback: (err?: Error) => void) => void
}

type Lock = {
  lock: (dir: string, callback: (err: Error | undefined, closer: Closer) => void) => void
  locked: (dir: string, callback: (err: Error | undefined, isLocked: boolean) => void) => void
}

type DataStore = any // todo: ipfs/interface-datastore

type IpfsRepoOptions = {
  lock: Lock | 'fs' | 'memory' // raw strings are deprecated
  storageBackends: {
    root: DataStore;
    blocks: DataStore;
    keys: DataStore;
    datastore: DataStore;
  }
  storageBackendOptions: {
    root: {
      extension: '' | string;
    },
    blocks: {
      sharding: boolean;
      extension: '.data' | string;
    },
    keys: any
  }
}

declare module "ipfs-repo" {
  class IpfsRepo {
    constructor(repoPath: string, options?: IpfsRepoOptions);

    init(config: Object, callback: (err?: Error) => void): void;
    open(callback: (err: Error | null) => void): void;
    close(callback: (err: Error | null) => void): void;
    exists(callback: (err: Error | null, isOpen: boolean) => void): void;
    stat(options: any, callback: (err: Error | null, result: any) => void): void;
    stat(callback: (err: Error | null, result: any) => void): void;

    readonly repoVersion: string;
  }

  export = IpfsRepo;
}
