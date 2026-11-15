import { describe, expect, it } from 'vitest'
import { Bus } from '@core/bus'
import { fixedClock } from '@core/clock'
import { openDb } from '@core/db/sqlite'
import { SettingsStore } from '@core/settings-store'
import { SlipService } from '@core/slip-service'
import { buildApi } from '../src/main/api/server'

function setup(scope: 'local' | 'lan' = 'local') {
  const db = openDb(':memory:')
  const bus = new Bus()
  const settings = new SettingsStore(db, bus)
  const slips = new SlipService(db, bus, fixedClock('2026-11-15T13:05:00Z'), settings, () => 'en')
  const tokens = { local: 'local-token', lan: 'lan-token', port: 4747 }
  const app = buildApi(
    {
      submit: (input) => ({ ...slips.submit(input), previewOnly: false }),
      quick: (raw) => ({ ...slips.submit(slips.quickToInput(raw)), previewOnly: false }),
      quickPreview: async () => new Uint8Array([137, 80, 78, 71]),
      preview: async () => new Uint8Array([137, 80, 78, 71]),
      list: (filter, limit) => slips.list({ filter, limit }),
      get: (ref) => slips.resolve(ref),
      setDone: (ref, done) => slips.setDone(ref, done),
      reprint: (ref) => void slips.reprint(ref),
      printer: () => ({ status: 'ok' }),
      tokens: () => tokens
    },
    scope
  )
  const req = (path: string, init: RequestInit & { host?: string; token?: string | null } = {}) =>
    app.request(path, {
      ...init,
      headers: {
        host: init.host ?? '127.0.0.1:4747',
        ...(init.token === null ? {} : { authorization: `Bearer ${init.token ?? 'local-token'}` }),
        ...(init.headers as Record<string, string> | undefined)
      }
    })
  return { req, slips }
}

describe('local REST API', () => {
  it('requires the bearer token and an allowlisted Host (DNS-rebinding guard)', async () => {
    const { req } = setup()
    expect((await req('/v1/slips', { token: null })).status).toBe(401)
    expect((await req('/v1/slips', { token: 'nope' })).status).toBe(401)
    expect((await req('/v1/slips', { host: 'evil.example:4747' })).status).toBe(403)
    expect((await req('/v1/health', { token: null })).status).toBe(200)
  })

  it('prints from quick syntax sent as a form body, like the CLI does', async () => {
    const { req, slips } = setup()
    const res = await req('/v1/quick?format=text', {
      method: 'POST',
      body: new URLSearchParams({ text: 'Buy milk !! #home @zítra' }),
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-slipstream-source': 'cli' }
    })
    expect(res.status).toBe(201)
    expect(await res.text()).toBe('Printing #00000  [ ]  Buy milk  !!  #home  @2026-11-16\n')
    expect(slips.getByNumber(0)!.source.kind).toBe('cli')
  })

  it('accepts JSON slips with idempotency keys and returns both code payloads', async () => {
    const { req } = setup()
    const body = JSON.stringify({ title: 'From iPhone', source: { kind: 'iphone', label: 'Shortcut' } })
    const init = { method: 'POST', body, headers: { 'content-type': 'application/json', 'idempotency-key': 'abc' } }
    const first = await req('/v1/slips', init)
    const again = await req('/v1/slips', init)
    expect(first.status).toBe(201)
    expect(again.status).toBe(200)
    const json = (await first.json()) as { slip: { code: string; qr: string } }
    expect(json.slip.code).toBe('S00000')
    expect(json.slip.qr).toBe('SLIPSTREAM://S/00000')
  })

  it('marks done by number or by scanned payload and lists as text', async () => {
    const { req } = setup()
    await req('/v1/quick', { method: 'POST', body: 'Water plants', headers: { 'content-type': 'text/plain' } })
    expect((await req('/v1/slips/SLIPSTREAM:%2F%2FS%2F00000/done', { method: 'POST' })).status).toBe(200)
    const list = await (await req('/v1/slips?status=done&format=text')).text()
    expect(list).toBe('#00000  [x]  Water plants\n')
    expect((await req('/v1/slips/99/done', { method: 'POST' })).status).toBe(404)
  })

  it('rejects invalid input with a 400 and readable issues', async () => {
    const { req } = setup()
    const res = await req('/v1/slips', { method: 'POST', body: JSON.stringify({ title: '' }), headers: { 'content-type': 'application/json' } })
    expect(res.status).toBe(400)
  })

  it('uses the separate LAN token on the network listener', async () => {
    const { req } = setup('lan')
    expect((await req('/v1/slips', { host: '127.0.0.1:4748' })).status).toBe(401)
    expect((await req('/v1/slips', { host: '127.0.0.1:4748', token: 'lan-token' })).status).toBe(200)
  })
})
