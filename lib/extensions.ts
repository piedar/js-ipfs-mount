
export function flatten<T>(arrays: T[][]): T[] {
  return [].concat.apply([], arrays);
}

export function resolve<T>(source: T | (() => T)): T {
  return typeof source === "function" ? source()
       : source
}

export function getOrAdd<TKey, TValue>(
  map: Map<TKey, TValue>, key: TKey,
  valueSource: TValue | (() => TValue)): TValue
{
  let value = map.get(key)
  if (value === undefined) {
    value = resolve(valueSource)
    map.set(key, value)
  }
  return value
}