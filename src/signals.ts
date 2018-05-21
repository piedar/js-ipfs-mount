
export function done(): Promise<void> {
  return new Promise((resolve, reject) => {
    process.on("SIGINT", () => resolve());
    //process.on("SIGTERM", () => resolve());
  });
}
