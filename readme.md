

## Mounts

`ipfs daemon` must already be running, but not necessarily as the same user who will `mount`.
The command line programs follow the pattern from `man mount` and can be customized with options from `man mount.fuse`.

### /ipfs

This read-only file system represents raw blocks and files in ipfs.
It aims for feature parity with `ipfs mount` of go-ipfs, but faster.

```bash
mkdir /ipfs
mount.ipfs /ipfs

# test
file /ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme
```

### /mfs

This mutable file system represents `ipfs files`.
Files and directories there are pinned to the local node.

```bash
mkdir /mfs
mount.mfs /mfs

# test
echo "hello" | ipfs files write --create /hello.txt
cat /mfs/hello.txt
```


## Install

    yarn global add git+https://github.com/piedar/js-ipfs-mount.git
    # or
    # npm install -g git+https://github.com/piedar/js-ipfs-mount.git

This software is beta-quality.
It exposes wide-network content to programs which were never designed for that.
Therefore, always run it inside an unprivileged user account, and __never__ as root.
Be careful opening untrusted links under `/ipfs/`.  Remember, you're still on the internet.


## Caveats

Because writes to `/mfs` are hashed and stored directly into `ipfs files write`, importing the same file with different tools might create new ipfs blocks!

You can see the chunk sizes in the debug log.

```bash
DEBUG=* mount.mfs /mfs &

dd if=/dev/zero of=/mfs/zeroes-64K bs=64K count=10
dd if=/dev/zero of=/mfs/zeroes-128K bs=128K count=5

ipfs files ls -l /
```
```
  ipfs-fuse:write { path: '/zeroes-128K' } +5ms
   write[42] 131072 bytes to 12320768
```
```
zeroes-64K      QmPrTfr3hKZq7YWA97Z7QU1vfVQQF9WY2zzmWaVDFJWzFR  655360
zeroes-128K     QmYAkYe8y1tmNeTxfp8HLDMVoupVbUP8jk4uksHeF8v5QC  655360
```

For best results, use `mbuffer` to standardize buffer sizes and improve performance for old tools which write in small chunks like 4096 bytes.

```
wget "${URL}" -O- | mbuffer -s 128k -o /mfs/downloads/"${FILE}"
```


## Developer quick start

```bash
git clone https://github.com/piedar/js-ipfs-mount
cd js-ipfs-mount
yarn && yarn prepare
DEBUG=* node dist/bin/mount.ipfs.js /ipfs
# hit Ctrl-C to stop
```

```bash
# programs under ./bin/ are marked executable
# on *nix systems, you can run them directly without recompiling!
yarn global add ts-node
DEBUG=* TS_NODE_FILES=true bin/mount.ipfs.ts /ipfs
```


## Performance

#### Invariants

```
$ test_file=QmdeM51CMbTZfzJvRyGa9GEWapuZhNiHxzAv8NefgM2Hw4/vlc-2.2.8.tar.xz
```

#### Benchmark go-ipfs 0.4.14

The built-in `ipfs mount` is __really__ slow, which is the first reason this project exists.

```
$ ipfs mount
$ time curl --output /dev/null file:///ipfs/${test_file}
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 21.1M  100 21.1M    0     0  1454k      0  0:00:14  0:00:14 --:--:-- 1609k

real    0m14.887s
user    0m0.008s
sys     0m0.123s
```

But querying through the local gateway is lightning fast.

```
$ time curl --output /dev/null http://localhost:8080/ipfs/${test_file}
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 21.1M  100 21.1M    0     0   351M      0 --:--:-- --:--:-- --:--:--  351M

real    0m0.066s
user    0m0.004s
sys     0m0.015s
```

#### Benchmark js-ipfs-mount fbe7ac6a7c35

Our mount is slower than the http gateway but still faster than `ipfs mount`.

```
$ mount.ipfs /ipfs
$ time curl --output /dev/null file:///ipfs/${test_file}
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 21.1M  100 21.1M    0     0  22.9M      0 --:--:-- --:--:-- --:--:-- 23.7M

real    0m0.949s
user    0m0.009s
sys     0m0.014s
```

Subsequent access should be way faster because `auto_cache` works well with immutable IPFS objects.


## Related

* https://github.com/ipfs/roadmap/issues/90
