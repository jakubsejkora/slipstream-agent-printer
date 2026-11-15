import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DESIGN_METAS } from '@designs/registry-meta'
import { buildSlipModel } from '@shared/slip-model'
import { SAMPLE_CREATED_AT, SAMPLE_FIXTURES, SAMPLE_TZ } from '@shared/samples'
import { encodePng1 } from '@raster/png1'
import type { Bitmap } from '@raster/types'
import type { RenderHost } from './render-host'
import { CALIBRATION_HEIGHT_DOTS, recapHeightDots } from './special-sizes'

/** Renders the non-slip pages (calibration/test page and daily recap) for review. */
export async function renderSpecials(host: RenderHost, outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  const model = buildSlipModel({ number: 0, title: '', createdAt: SAMPLE_CREATED_AT, tz: SAMPLE_TZ, source: { kind: 'dashboard' }, lang: 'en', card: 'slip' })
  const cal = await host.render({ designId: '@calibration', model, special: { kind: 'calibration', data: { createdLocal: '2026-11-15 14:05', topDeadDots: 92, darkness: 0, fonts: [] } }, height: CALIBRATION_HEIGHT_DOTS })
  writeFileSync(join(outDir, 'special--calibration.png'), cal.png)
  const done = [
    { numberText: '00041', title: 'Renew passport' },
    { numberText: '00042', title: 'Zavolat Šárce kvůli čtvrteční zkoušce' },
    { numberText: '00045', title: 'Ship v1 of Slipstream and celebrate with the whole studio on Friday' }
  ]
  const recap = await host.render({ designId: '@recap', model, special: { kind: 'recap', data: { dateLocal: '2026-11-15', lang: 'en', done, open: 4, printed: 7 } }, height: recapHeightDots(done.length) })
  writeFileSync(join(outDir, 'special--recap.png'), recap.png)
  console.log(`specials: calibration ${cal.ms}ms ${cal.warnings.join(',') || 'ok'}, recap ${recap.ms}ms ${recap.warnings.join(',') || 'ok'}`)
}

/** Renders every design × sample fixture into PNGs plus a per-design contact sheet. Used for visual review and goldens. */
const BLOCKING = ['decode-fail', 'quiet-zone', 'font-fallback', 'color-emoji', 'ink-heavy']

/** Returns the number of renders with blocking warnings (used by `pnpm samples --check`). */
export async function renderSamples(host: RenderHost, outDir: string, only?: string[]): Promise<number> {
  let failures = 0
  mkdirSync(outDir, { recursive: true })
  const summary: unknown[] = []
  for (const meta of DESIGN_METAS) {
    if (only && only.length && !only.includes(meta.id)) continue
    const sheet: Bitmap[] = []
    for (const fx of SAMPLE_FIXTURES) {
      const model = buildSlipModel({ ...fx.input, lang: fx.input.lang ?? 'en', card: meta.card, createdAt: SAMPLE_CREATED_AT, tz: SAMPLE_TZ })
      const res = await host.render({ designId: meta.id, model, selfTest: true, keepGray: true })
      writeFileSync(join(outDir, `${meta.id}--${fx.id}.png`), res.png)
      if (res.grayPng) writeFileSync(join(outDir, `${meta.id}--${fx.id}.gray.png`), res.grayPng)
      sheet.push(res.bitmap)
      if (res.warnings.some((w) => BLOCKING.includes(w))) failures++
      summary.push({ design: meta.id, fixture: fx.id, ms: res.ms, warnings: res.warnings, ink: +res.lint.inkCoverage.toFixed(3), thin: +res.lint.thinRatio.toFixed(3), fits: res.fits, decode: res.decode })
      console.log(`${meta.id.padEnd(18)} ${fx.id.padEnd(7)} ${String(res.ms).padStart(5)}ms ink=${res.lint.inkCoverage.toFixed(3)} thin=${res.lint.thinRatio.toFixed(3)} ${res.warnings.join(',') || 'ok'} fit=${res.fits.map((f) => `${f.size}px×${f.lines}`).join('/')}`)
    }
    writeFileSync(join(outDir, `${meta.id}--sheet.png`), encodePng1(contactSheet(sheet, 24)))
  }
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
  return failures
}

function contactSheet(items: Bitmap[], gap: number): Bitmap {
  const width = items.reduce((n, b) => n + b.width, 0) + gap * (items.length + 1)
  const height = Math.max(...items.map((b) => b.height)) + gap * 2
  const data = new Uint8Array(width * height)
  // light frame so each slip edge is visible on the sheet
  let x0 = gap
  for (const b of items) {
    for (let y = 0; y < b.height; y++) data.set(b.data.subarray(y * b.width, (y + 1) * b.width), (y + gap) * width + x0)
    for (let y = gap - 2; y < gap + b.height + 2; y++) {
      data[y * width + x0 - 2] = 1
      data[y * width + x0 + b.width + 1] = 1
    }
    for (let x = x0 - 2; x < x0 + b.width + 2; x++) {
      data[(gap - 2) * width + x] = 1
      data[(gap + b.height + 1) * width + x] = 1
    }
    x0 += b.width + gap
  }
  return { width, height, data }
}
