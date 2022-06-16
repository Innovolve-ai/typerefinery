import { app } from "electron"
import { mkdirSync } from "fs"
import path from "path"

export function resourcePath(...segments: string[]) {
  const filepath = app.isPackaged
    ? path.join(process.resourcesPath, "app", "assets", ...segments)
    : path.join(process.cwd(), "assets", ...segments)
  return makesure(filepath)
}

export function dataPath(...segments: string[]) {
  let filepath
  if (app) {
    filepath = path.join(app.getPath("userData"), ...segments)
  } else {
    filepath = path.join(process.cwd(), ...segments)
  }
  return makesure(filepath)
}

export function resourceBinary(...segments: string[]) {
  const filepath =
    process.platform === "win32"
      ? resourcePath("bin", ...segments) + ".exe"
      : resourcePath("bin", ...segments)
  return makesure(filepath)
}

function makesure(filepath: string): string {
  try {
    if (path.extname(filepath) === "") {
      mkdirSync(filepath, { recursive: true })
    } else {
      mkdirSync(path.dirname(filepath), { recursive: true })
    }
  } catch {
    // ignore
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    return filepath
  }
}
