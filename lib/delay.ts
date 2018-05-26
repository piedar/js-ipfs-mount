
export function delay(msTime: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msTime)
  })
}
