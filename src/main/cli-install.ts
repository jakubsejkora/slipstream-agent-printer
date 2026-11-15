import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function cliSource(): string {
  return app.isPackaged ? join(process.resourcesPath, 'cli', 'slip') : join(app.getAppPath(), 'resources', 'cli', 'slip')
}

const USER_TARGET = join(homedir(), '.local', 'bin', 'slip')
const SYSTEM_TARGET = '/usr/local/bin/slip'

/** Returns the installed `slip` path if a symlink points at our script. */
export function cliInstalled(): string | null {
  for (const t of [USER_TARGET, SYSTEM_TARGET]) {
    try {
      if (lstatSync(t).isSymbolicLink() && readlinkSync(t) === cliSource()) return t
    } catch {
      /* not there */
    }
  }
  return null
}

/** Symlinks the CLI into ~/.local/bin (no admin) or /usr/local/bin (asks for an admin password, like VS Code). */
export async function installCli(target: 'user' | 'system'): Promise<string> {
  const src = cliSource()
  if (!existsSync(src)) throw new Error(`CLI script missing at ${src}`)
  if (target === 'user') {
    mkdirSync(join(homedir(), '.local', 'bin'), { recursive: true })
    try {
      unlinkSync(USER_TARGET)
    } catch {
      /* not there */
    }
    symlinkSync(src, USER_TARGET)
    return USER_TARGET
  }
  const script = `do shell script "mkdir -p /usr/local/bin && ln -sf '${src.replace(/'/g, "'\\''")}' '${SYSTEM_TARGET}'" with administrator privileges`
  await new Promise<void>((resolve, reject) => execFile('osascript', ['-e', script], (err) => (err ? reject(err) : resolve())))
  return SYSTEM_TARGET
}
