// Rasterizes scripts/icon.svg at 1024 px with an offscreen window, then builds build/icon.icns via iconutil.
const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

app.dock?.hide()
app.whenReady().then(async () => {
  const root = join(__dirname, '..')
  const svg = readFileSync(join(__dirname, 'icon.svg'), 'utf8')
  const win = new BrowserWindow({ show: false, width: 1024, height: 1024, frame: false, transparent: true, webPreferences: { offscreen: { deviceScaleFactor: 1 } } })
  await win.loadURL(`data:text/html,<html><body style="margin:0;background:transparent">${encodeURIComponent(svg)}</body></html>`)
  await new Promise((r) => setTimeout(r, 400))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })
  const set = join(root, 'build', 'icon.iconset')
  mkdirSync(set, { recursive: true })
  writeFileSync(join(root, 'build', 'icon.png'), img.toPNG())
  for (const s of [16, 32, 128, 256, 512]) {
    writeFileSync(join(set, `icon_${s}x${s}.png`), img.resize({ width: s, height: s, quality: 'best' }).toPNG())
    writeFileSync(join(set, `icon_${s}x${s}@2x.png`), img.resize({ width: s * 2, height: s * 2, quality: 'best' }).toPNG())
  }
  execFileSync('iconutil', ['-c', 'icns', set, '-o', join(root, 'build', 'icon.icns')])
  console.log('wrote build/icon.icns')
  app.exit(0)
})
