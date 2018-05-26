
const searchPaths = [
  "../package.json",
  "../../package.json",
]

let packageJson: any = undefined

for (const path of searchPaths) {
  try {
    packageJson = require(path)
  } catch (e) {

  }
}

if (!packageJson) {
  throw new Error("package.json not found!")
}

export const version: string = packageJson.version
