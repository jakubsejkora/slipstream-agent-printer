import { deflateSync, inflateSync } from 'node:zlib'
import { pack, unpack } from './pack'
import type { Bitmap } from './types'

const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Encodes a 1-bit bitmap as a grayscale PNG (bit depth 1). Ink (1) is stored as black (PNG 0). */
export function encodePng1(bm: Bitmap): Uint8Array {
  const packed = pack(bm)
  const raw = new Uint8Array((packed.rowBytes + 1) * bm.height)
  for (let y = 0; y < bm.height; y++) {
    raw[y * (packed.rowBytes + 1)] = 0 // filter: none
    for (let b = 0; b < packed.rowBytes; b++) raw[y * (packed.rowBytes + 1) + 1 + b] = ~packed.data[y * packed.rowBytes + b] & 0xff
  }
  const ihdr = new Uint8Array(13)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, bm.width)
  v.setUint32(4, bm.height)
  ihdr[8] = 1 // bit depth
  ihdr[9] = 0 // grayscale
  return concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))])
}

/** Decodes PNGs written by encodePng1 (1-bit grayscale, filter 0). */
export function decodePng1(png: Uint8Array): Bitmap {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let o = 8
  let width = 0
  let height = 0
  const idat: Uint8Array[] = []
  while (o < png.length) {
    const len = view.getUint32(o)
    const type = String.fromCharCode(png[o + 4], png[o + 5], png[o + 6], png[o + 7])
    const data = png.subarray(o + 8, o + 8 + len)
    if (type === 'IHDR') {
      width = view.getUint32(o + 8)
      height = view.getUint32(o + 12)
      if (png[o + 16] !== 1 || png[o + 17] !== 0) throw new Error('decodePng1 only supports 1-bit grayscale')
    } else if (type === 'IDAT') idat.push(data)
    o += 12 + len
  }
  const raw = inflateSync(concat(idat))
  const rowBytes = Math.ceil(width / 8)
  const packed = new Uint8Array(rowBytes * height)
  for (let y = 0; y < height; y++) {
    if (raw[y * (rowBytes + 1)] !== 0) throw new Error('decodePng1 only supports filter type 0')
    for (let b = 0; b < rowBytes; b++) packed[y * rowBytes + b] = ~raw[y * (rowBytes + 1) + 1 + b] & 0xff
  }
  return unpack({ width, height, rowBytes, data: packed })
}

/** Expands a 1-bit bitmap to RGBA (for decoders and canvas previews). */
export function toRGBA(bm: Bitmap): Uint8ClampedArray {
  const out = new Uint8ClampedArray(bm.width * bm.height * 4)
  for (let i = 0; i < bm.data.length; i++) {
    const v = bm.data[i] ? 0 : 255
    out[i * 4] = v
    out[i * 4 + 1] = v
    out[i * 4 + 2] = v
    out[i * 4 + 3] = 255
  }
  return out
}
