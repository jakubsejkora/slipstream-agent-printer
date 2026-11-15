import { Menu, Tray, nativeImage, type NativeImage } from 'electron'

/** Draws the 18 pt template icon (a slip with a code rail) at 2× in code, so no image assets are needed. */
export function drawIcon(state: 'ready' | 'offline'): NativeImage {
  const S = 36
  const buf = Buffer.alloc(S * S * 4)
  const px = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= S || y >= S) return
    const i = (y * S + x) * 4
    buf[i] = 0
    buf[i + 1] = 0
    buf[i + 2] = 0
    buf[i + 3] = 255
  }
  const rect = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y)
  }
  const L = 9
  const R = 26
  const T = 3
  const B = 31
  // outline (dashed when offline)
  for (let y = T; y <= B; y++) {
    if (state === 'offline' && Math.floor(y / 3) % 2 === 1) continue
    rect(L, y, L + 1, y)
    rect(R - 1, y, R, y)
  }
  for (let x = L; x <= R; x++) {
    if (state === 'offline' && Math.floor(x / 3) % 2 === 1) continue
    rect(x, T, x, T + 1)
  }
  // torn bottom edge
  for (let x = L; x <= R; x++) {
    const zig = (x - L) % 6 < 3 ? (x - L) % 3 : 2 - ((x - L) % 3)
    rect(x, B - zig - 1, x, B - zig)
  }
  if (state === 'ready') {
    rect(13, 8, 22, 11) // title
    rect(13, 14, 22, 15) // text line
    rect(13, 18, 19, 19)
    for (const x of [13, 15, 16, 18, 20, 21]) rect(x, 22, x, 26) // code rail
  } else {
    rect(17, 9, 18, 19) // exclamation
    rect(17, 22, 18, 23)
  }
  const img = nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 })
  img.setTemplateImage(true)
  return img
}

export class AppTray {
  readonly tray: Tray
  private icons = { ready: drawIcon('ready'), offline: drawIcon('offline') }

  constructor(onClick: () => void, buildMenu: () => Menu) {
    this.tray = new Tray(this.icons.ready)
    this.tray.setToolTip('Slipstream')
    this.tray.on('click', onClick)
    this.tray.on('right-click', () => this.tray.popUpContextMenu(buildMenu()))
  }

  update(opts: { ready: boolean; queued: number }): void {
    this.tray.setImage(opts.ready ? this.icons.ready : this.icons.offline)
    this.tray.setTitle(opts.queued > 0 ? ` ${opts.queued}` : '', { fontType: 'monospacedDigit' })
  }

  bounds(): Electron.Rectangle {
    return this.tray.getBounds()
  }
}
