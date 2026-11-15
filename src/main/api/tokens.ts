import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

export interface ApiTokens {
  local: string
  lan: string
  port: number
}

const newToken = (): string => randomBytes(24).toString('base64url')

/**
 * Tokens live in a 0600 dotenv-style file in userData so the `slip` CLI (a shell script) can read them.
 * SLIPSTREAM_URL / SLIPSTREAM_TOKEN are the local loopback credentials; the LAN token is separate.
 */
export function loadTokens(path: string, port: number): ApiTokens {
  let local = ''
  let lan = ''
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const [k, ...rest] = line.split('=')
      const v = rest.join('=').trim()
      if (k === 'SLIPSTREAM_TOKEN') local = v
      if (k === 'SLIPSTREAM_LAN_TOKEN') lan = v
    }
  }
  const tokens = { local: local || newToken(), lan: lan || newToken(), port }
  saveTokens(path, tokens)
  return tokens
}

export function saveTokens(path: string, t: ApiTokens): void {
  writeFileSync(path, `SLIPSTREAM_URL=http://127.0.0.1:${t.port}\nSLIPSTREAM_TOKEN=${t.local}\nSLIPSTREAM_LAN_TOKEN=${t.lan}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function rotate(path: string, t: ApiTokens, which: 'local' | 'lan'): ApiTokens {
  const next = { ...t, [which]: newToken() }
  saveTokens(path, next)
  return next
}
