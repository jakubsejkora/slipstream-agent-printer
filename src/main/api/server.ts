import { serve, type ServerType } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import { networkInterfaces, hostname } from 'node:os'
import { ZodError } from 'zod'
import { SlipError } from '@core/slip-service'
import type { PreviewRequest } from '@shared/ipc'
import type { Slip, SlipInput } from '@shared/types'
import type { ApiTokens } from './tokens'

export interface ApiDeps {
  submit(input: SlipInput): { slip: Slip; duplicate: boolean; previewOnly: boolean }
  quick(input: unknown): { slip: Slip; duplicate: boolean; previewOnly: boolean }
  quickPreview(input: unknown): Promise<Uint8Array>
  preview(req: PreviewRequest): Promise<Uint8Array>
  list(filter: 'open' | 'done' | 'all', limit: number): Slip[]
  get(ref: string): Slip
  setDone(ref: string, done: boolean): Slip
  reprint(ref: string): void
  printer(): unknown
  tokens(): ApiTokens
}

/** One line per slip for the shell CLI (no jq needed): "#00042  [ ] Buy milk  !!  #home  @2026-11-16". */
export const slipLine = (s: Slip): string =>
  [
    `#${String(s.number).padStart(5, '0')}`,
    s.doneAt ? '[x]' : '[ ]',
    s.title,
    s.priority ? '!'.repeat(s.priority) : '',
    s.tag ? `#${s.tag}` : '',
    s.due ? `@${s.due.kind === 'today' ? 'today' : s.due.date}` : ''
  ]
    .filter(Boolean)
    .join('  ')

const slipJson = (s: Slip): Record<string, unknown> => ({
  ...s,
  numberText: String(s.number).padStart(5, '0'),
  code: `S${String(s.number).padStart(5, '0')}`,
  qr: `SLIPSTREAM://S/${String(s.number).padStart(5, '0')}`
})

/** Small local REST API used by the `slip` CLI, Raycast and (opt-in, over the LAN) iPhone Shortcuts. */
export function buildApi(deps: ApiDeps, scope: 'local' | 'lan'): Hono {
  const app = new Hono()
  const lanHosts = new Set<string>()

  app.use('*', async (c, next) => {
    // DNS-rebinding / CSRF protection: exact Host allowlist + bearer token, and no CORS headers at all.
    const host = (c.req.header('host') ?? '').replace(/:\d+$/, '').toLowerCase()
    const allowedLocal = host === '127.0.0.1' || host === 'localhost'
    if (scope === 'lan') {
      if (!lanHosts.size) for (const h of lanHostnames()) lanHosts.add(h)
      if (!lanHosts.has(host) && !allowedLocal) return c.json({ error: 'host not allowed' }, 403)
    } else if (!allowedLocal) return c.json({ error: 'host not allowed' }, 403)
    if (c.req.path === '/v1/health') return next()
    const auth = c.req.header('authorization') ?? ''
    const expected = scope === 'lan' ? deps.tokens().lan : deps.tokens().local
    if (auth !== `Bearer ${expected}`) return c.json({ error: 'missing or wrong token' }, 401)
    return next()
  })

  app.onError((err, c) => {
    if (err instanceof ZodError) return c.json({ error: 'invalid input', issues: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, 400)
    if (err instanceof SlipError) return c.json({ error: err.message }, err.code === 'not-found' ? 404 : 400)
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  })

  const source = (c: Context, fallback: 'api' | 'cli' | 'iphone'): { kind: 'api' | 'cli' | 'iphone'; label?: string } => {
    const kind = (c.req.header('x-slipstream-source') as 'api' | 'cli' | 'iphone' | undefined) ?? fallback
    const label = c.req.header('x-slipstream-label') ?? undefined
    return { kind: ['api', 'cli', 'iphone'].includes(kind) ? kind : fallback, ...(label ? { label: label.slice(0, 40) } : {}) }
  }

  app.get('/v1/health', (c) => c.json({ ok: true, app: 'slipstream' }))

  const text = (c: Context): boolean => c.req.query('format') === 'text'
  const created = (c: Context, res: { slip: Slip; duplicate: boolean; previewOnly: boolean }): Response => {
    if (text(c)) {
      const verb = res.previewOnly ? 'Preview only' : res.duplicate ? 'Already printed' : 'Printing'
      return c.text(`${verb} ${slipLine(res.slip)}\n`, res.duplicate ? 200 : 201)
    }
    return c.json({ slip: slipJson(res.slip), duplicate: res.duplicate, previewOnly: res.previewOnly }, res.duplicate ? 200 : 201)
  }
  const one = (c: Context, s: Slip): Response => (text(c) ? c.text(`${slipLine(s)}\n`) : c.json({ slip: slipJson(s) }))

  app.post('/v1/slips', async (c) => {
    const body = (await c.req.json()) as SlipInput
    return created(c, deps.submit({ ...body, source: body.source ?? source(c, scope === 'lan' ? 'iphone' : 'api'), idempotencyKey: body.idempotencyKey ?? c.req.header('idempotency-key') ?? undefined }))
  })

  app.post('/v1/quick', async (c) => {
    const ct = c.req.header('content-type') ?? ''
    let body: Record<string, unknown>
    if (ct.includes('application/json')) body = await c.req.json()
    else if (ct.includes('form')) body = Object.fromEntries(Object.entries(await c.req.parseBody()).map(([k, v]) => [k, String(v)]))
    else body = { text: await c.req.text() }
    const input = { ...body, source: (body.source as object) ?? source(c, scope === 'lan' ? 'iphone' : 'api'), idempotencyKey: (body.idempotencyKey as string) ?? c.req.header('idempotency-key') ?? undefined }
    if (c.req.query('preview') !== undefined) {
      const png = await deps.quickPreview(input)
      return c.body(Buffer.from(png), 200, { 'content-type': 'image/png' })
    }
    return created(c, deps.quick(input))
  })

  app.post('/v1/preview', async (c) => {
    const png = await deps.preview((await c.req.json()) as PreviewRequest)
    return c.body(Buffer.from(png), 200, { 'content-type': 'image/png' })
  })

  app.get('/v1/slips', (c) => {
    const f = (c.req.query('status') as 'open' | 'done' | 'all' | undefined) ?? 'all'
    const slips = deps.list(['open', 'done', 'all'].includes(f) ? f : 'all', Math.min(500, Number(c.req.query('limit') ?? 50)))
    if (text(c)) return c.text(slips.map((s) => `${slipLine(s)}\n`).join(''))
    return c.json({ slips: slips.map(slipJson) })
  })
  app.get('/v1/slips/:ref', (c) => one(c, deps.get(c.req.param('ref'))))
  app.post('/v1/slips/:ref/done', (c) => one(c, deps.setDone(c.req.param('ref'), true)))
  app.post('/v1/slips/:ref/undone', (c) => one(c, deps.setDone(c.req.param('ref'), false)))
  app.post('/v1/slips/:ref/reprint', (c) => {
    deps.reprint(c.req.param('ref'))
    return text(c) ? c.text(`Reprinting ${slipLine(deps.get(c.req.param('ref')))}\n`, 202) : c.json({ ok: true }, 202)
  })
  app.get('/v1/printer', (c) => c.json(deps.printer() as object))
  return app
}

export function lanHostnames(): string[] {
  const out = new Set<string>()
  const h = hostname().toLowerCase()
  out.add(h)
  out.add(h.endsWith('.local') ? h : `${h}.local`)
  for (const list of Object.values(networkInterfaces())) for (const ni of list ?? []) if (ni.family === 'IPv4' && !ni.internal) out.add(ni.address)
  return [...out]
}

export function lanAddress(): string | null {
  for (const list of Object.values(networkInterfaces())) for (const ni of list ?? []) if (ni.family === 'IPv4' && !ni.internal) return ni.address
  return null
}

export function startServer(app: Hono, port: number, hostnameToBind: string): Promise<ServerType> {
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port, hostname: hostnameToBind }, () => resolve(server))
    server.on('error', reject)
  })
}
