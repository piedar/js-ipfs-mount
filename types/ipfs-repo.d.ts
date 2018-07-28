
interface IpfsRepoOptions {
  lock: 'fs' | string;
  storageBackends: {
    root: any;
    blocks: any;
    keys: any;
    datastore: any;
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

    init(config: any, callback: (err?: Error) => void): void;
    open(callback: (err: Error | null) => void): void;
    close(callback: (err: Error | null) => void): void;
    exists(callback: (err: Error | null, isOpen: boolean) => void): void;
    stat(options: any, callback: (err: Error | null, result: any) => void): void;
    stat(callback: (err: Error | null, result: any) => void): void;

    readonly repoVersion: string;
  }

  export = IpfsRepo;
}
