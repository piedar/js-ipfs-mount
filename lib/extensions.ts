
export function flatten<T>(arrays: T[][]): T[] {
  return [].concat.apply([], arrays);
}
