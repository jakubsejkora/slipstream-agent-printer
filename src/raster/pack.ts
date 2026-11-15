import type { Bitmap, PackedBitmap } from './types'

export function pack(bm: Bitmap): PackedBitmap {
  const rowBytes = Math.ceil(bm.width / 8)
  const data = new Uint8Array(rowBytes * bm.height)
  for (let y = 0; y < bm.height; y++) {
    for (let x = 0; x < bm.width; x++) {
      if (bm.data[y * bm.width + x]) data[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }
  return { width: bm.width, height: bm.height, rowBytes, data }
}

export function unpack(p: PackedBitmap): Bitmap {
  const data = new Uint8Array(p.width * p.height)
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      data[y * p.width + x] = p.data[y * p.rowBytes + (x >> 3)] & (0x80 >> (x & 7)) ? 1 : 0
    }
  }
  return { width: p.width, height: p.height, data }
}

export function inkCount(bm: Bitmap): number {
  let n = 0
  for (let i = 0; i < bm.data.length; i++) n += bm.data[i]
  return n
}
