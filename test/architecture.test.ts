import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

describe('architecture', () => {
  it('keeps the core free of Electron so it can run in tests, a CLI or a future MCP/iOS bridge', () => {
    const pure = ['src/shared', 'src/core', 'src/raster', 'src/escpos', 'src/printer', 'src/designs'].flatMap((d) => files(d))
    const offenders = pure.filter((f) => /from ['"]electron['"]/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
