import '@designs/fonts/fonts.css'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { DesignBoundary, FitContext, FitTracker } from '@designs/_kit'
import { getDesign } from '@designs/registry'
import type { RenderJob, RenderReady } from '@shared/render-protocol'
import type { Rect } from '@raster/types'
import { Calibration } from './special/Calibration'
import { Recap } from './special/Recap'

const root = createRoot(document.getElementById('root')!)
const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

function rectsOf(container: Element, selector: string): Rect[] {
  const base = container.getBoundingClientRect()
  return [...container.querySelectorAll(selector)].map((el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left - base.left), y: Math.round(r.top - base.top), w: Math.round(r.width), h: Math.round(r.height) }
  })
}

async function run(job: RenderJob): Promise<void> {
  const design = getDesign(job.designId)
  const tracker = new FitTracker()
  const Component = design.Component
  const special = job.special
  flushSync(() => {
    root.render(
      <FitContext.Provider value={tracker} key={job.jobId}>
        {special?.kind === 'calibration' ? (
          <Calibration data={special.data} />
        ) : special?.kind === 'recap' ? (
          <Recap data={special.data} />
        ) : (
          <DesignBoundary onError={(e) => window.slipRender.fail({ jobId: job.jobId, message: `${design.meta.name.en} failed to render: ${e.message}` })}>
            <Component slip={job.model} tokens={{ ...defaults(design.meta.tokens), ...job.tokens }} />
          </DesignBoundary>
        )}
      </FitContext.Provider>
    )
  })
  const fonts = (document as Document & { fonts: FontFaceSet }).fonts
  const families = special ? ['Departure Mono', 'Inter Tight', 'Newsreader', 'Archivo', 'Big Shoulders', 'Jost', 'IBM Plex Sans Condensed', 'IBM Plex Mono', 'Playfair Display', 'Courier Prime', 'Barlow Condensed', 'Libre Franklin', 'Unbounded', 'Abril Fatface', 'Alfa Slab One', 'Handjet'] : design.meta.fonts
  // Load every face (all weights/styles) of the families in use, not just the regular one, so static
  // multi-weight families like IBM Plex or Courier Prime are complete before capture.
  const wanted = new Set([...families, 'Noto Emoji'])
  const faces: Promise<unknown>[] = []
  fonts.forEach((face) => {
    if (wanted.has(face.family.replace(/^["']|["']$/g, ''))) faces.push(face.load().catch(() => null))
  })
  await Promise.all(faces)
  void document.body.offsetHeight // force style + layout so any remaining font loads start now
  await fonts.ready
  await raf()
  await tracker.whenIdle()
  await raf()
  await raf()
  const slipEl = document.querySelector('[data-slip-root]')
  if (!slipEl) throw new Error('design did not render a SlipFrame')
  const box = slipEl.getBoundingClientRect()
  const missingFonts = special ? [] : design.meta.fonts.filter((f) => !fonts.check(`16px "${f}"`))
  const ready: RenderReady = {
    jobId: job.jobId,
    width: Math.round(box.width),
    height: Math.round(box.height),
    crispRects: rectsOf(slipEl, '[data-crisp]'),
    toneRects: rectsOf(slipEl, '[data-tone]'),
    quietRects: rectsOf(slipEl, '[data-quiet]'),
    fits: tracker.fits,
    warnings: [...tracker.warnings],
    missingFonts
  }
  window.slipRender.ready(ready)
}

function defaults(tokens: Array<{ key: string; default: number | boolean | string }> | undefined): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {}
  for (const t of tokens ?? []) out[t.key] = t.default
  return out
}

window.slipRender.onJob((job) => {
  run(job).catch((err: unknown) => window.slipRender.fail({ jobId: job.jobId, message: err instanceof Error ? err.message : String(err) }))
})
window.slipRender.hello()
