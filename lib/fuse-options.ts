
// fuse-native now handles options in an annoying way
// rather than accept them directly, it makes you pass them in as { keyName: value } and converts to key_name=value
// see https://github.com/fuse-friends/fuse-native/blob/42e53213650036be3fa0c7412a9c3ae840c7ffbb/index.js#L169
// we want to accept regular options like auto_cache, so do the inverse conversion first

function snakeToCamel(input: string) {
  return input.replace(/_[a-z]/gi, sub => sub.substring(1).toUpperCase())
}

export function parseFuseOptions(options: string[]) {
  const fuseOptions: { [key: string]: string | boolean } = { }

  for (const option of options) {
    const asCamel = snakeToCamel(option)

    const match = asCamel.match(/(\w+)(=(\w+))?/)
    if (!match) throw { message: "unrecognized option", option }

    const key = match[1]
    const value = match[3] || true // right side of = or true if no =
    fuseOptions[key] = value
  }

  return fuseOptions
}
