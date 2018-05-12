

### todo

[ ] - mount /mfs

    mkdir /mfs
    ipfs-mount --mfs=/mfs

[ ] - mount /ipfs
[ ] - mount /ipns
[ ] specs


## Performance

#### Invariants

```
$ test_file=QmdeM51CMbTZfzJvRyGa9GEWapuZhNiHxzAv8NefgM2Hw4/vlc-2.2.8.tar.xz
```

#### Benchmark go-ipfs 0.4.14

The built-in `ipfs mount` is __really__ slow, which is the main reason this project exists.

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

#### Benchmark js-ipfs-mount 76c171c72fc4

Our mount is slower than the http gateway but still faster than `ipfs mount`.

```
$ ts-node src/mount.ts --ipfs /ipfs-mount
$ time curl --output /dev/null file:///ipfs-mount/${test_file}
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 21.1M  100 21.1M    0     0  24.3M      0 --:--:-- --:--:-- --:--:-- 25.4M

real    0m0.883s
user    0m0.008s
sys     0m0.020s
```
