
export function done(message: string): Promise<void> {
  console.log(message)
  return new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
    //process.on("SIGTERM", () => resolve());
  });
}
