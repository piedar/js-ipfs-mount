import { Readable, Writable } from "stream"


export function endOf(stream: Readable) {
  return new Promise((resolve, reject) => {
    stream.on("end", resolve)
    stream.on("error", reject)
  })
}

export function flatten<T>(arrays: T[][]): T[] {
  return (new Array<T>()).concat.apply([], arrays);
}

function isFunction(thing: any): thing is Function {
  return typeof thing === 'function'
  // this works inline, but is apparently not as reliable
  //return thing instanceof Function
}

export function resolve<T>(source: T | (() => T)): T {
  return isFunction(source) ? source()
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
