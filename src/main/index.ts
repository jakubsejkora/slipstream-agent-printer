import { app } from 'electron'
import { join } from 'node:path'
import { startApp } from './app'
import { RenderHost } from './render-host'
import { renderSamples, renderSpecials } from './samples'

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

if (process.argv.includes('--render-samples')) {
  app.dock?.hide()
  app.whenReady().then(async () => {
    const host = new RenderHost()
    try {
      const out = argValue('--out') ?? join(process.cwd(), '.context', 'samples')
      const only = argValue('--designs')?.split(',')
      if (process.argv.includes('--specials')) await renderSpecials(host, out)
      const failures = only?.[0] === 'none' ? 0 : await renderSamples(host, out, only)
      console.log(`samples written to ${out}${failures ? `, ${failures} with blocking warnings` : ''}`)
      app.exit(process.argv.includes('--check') && failures ? 1 : 0)
    } catch (err) {
      console.error(err)
      app.exit(1)
    }
  })
} else {
  // Full app bootstrap lives in ./app (tray, windows, services).
  startApp()
}
