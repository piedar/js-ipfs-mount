
export async function* filter<T>(source: AsyncIterable<T>, predicate: (item: T) => boolean | PromiseLike<boolean>) {
  for await (const item of source) {
    if (await predicate(item)) {
      yield item
    }
  }
}

export async function* map<TSource, TResult>(source: AsyncIterable<TSource>, transform: (item: TSource) => TResult | PromiseLike<TResult>) {
  for await (const item of source) {
    yield await transform(item)
  }
}

export async function gather<T>(source: AsyncIterable<T>) {
  const results = []
  for await (const item of source) {
    results.push(item)
  }
  return results
}
