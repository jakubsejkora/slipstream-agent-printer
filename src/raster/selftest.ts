import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import { toRGBA } from './png1'
import type { Bitmap } from './types'

let prepared: Promise<unknown> | null = null

function ensureDecoder(): Promise<unknown> {
  if (!prepared) {
    const require = createRequire(import.meta.url)
    const wasm = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'))
    prepared = Promise.resolve(
      prepareZXingModule({
        overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer },
        fireImmediately: true
      })
    )
  }
  return prepared
}

export interface DecodeResult {
  qr: string | null
  code128: string | null
}

/** Decodes the QR and Code 128 from a final 1-bit bitmap. Optional dilation mimics thermal dot gain. */
export async function decodeCodes(bm: Bitmap, opts: { dilate?: boolean } = {}): Promise<DecodeResult> {
  await ensureDecoder()
  const src = opts.dilate ? dilate(bm) : bm
  // Pad with a white border so codes touching the canvas edge still get a quiet zone.
  const padded = padWhite(src, 24)
  const image = { data: toRGBA(padded), width: padded.width, height: padded.height, colorSpace: 'srgb' as const }
  const results = await readBarcodes(image as unknown as Parameters<typeof readBarcodes>[0], {
    formats: ['QRCode', 'Code128'],
    tryHarder: true,
    maxNumberOfSymbols: 8
  })
  const pick = (format: string): string | null => results.find((r) => r.isValid && r.format === format)?.text ?? null
  return { qr: pick('QRCode'), code128: pick('Code128') }
}

function padWhite(bm: Bitmap, pad: number): Bitmap {
  const width = bm.width + pad * 2
  const height = bm.height + pad * 2
  const data = new Uint8Array(width * height)
  for (let y = 0; y < bm.height; y++) data.set(bm.data.subarray(y * bm.width, (y + 1) * bm.width), (y + pad) * width + pad)
  return { width, height, data }
}

function dilate(bm: Bitmap): Bitmap {
  const { width, height, data } = bm
  const out = new Uint8Array(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      out[i] = data[i] || (x > 0 && data[i - 1]) || (y > 0 && data[i - width]) ? 1 : 0
    }
  }
  return { width, height, data: out }
}
