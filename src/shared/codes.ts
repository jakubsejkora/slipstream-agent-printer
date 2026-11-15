import QRCode from 'qrcode'

/**
 * Slip identity and scannable payloads.
 * These formats are PERMANENT: printed slips must stay scannable by future apps.
 *  - QR:       SLIPSTREAM://S/00042  (uppercase → QR alphanumeric mode → version 1, 21×21)
 *  - Code 128: S00042                (always 90 modules for 5- and 6-digit numbers)
 */
export const NUMBER_PAD = 5

export function formatNumber(n: number): string {
  return String(n).padStart(NUMBER_PAD, '0')
}
export function shortCode(n: number): string {
  return `S${formatNumber(n)}`
}
export function qrPayload(n: number): string {
  return `SLIPSTREAM://S/${formatNumber(n)}`
}

const SCAN_RE = /^(?:SLIPSTREAM:\/\/S\/|S)(\d{5,})$/i
/** Accepts either printed payload (or what a keyboard-wedge scanner types) and returns the slip number. */
export function parseScan(text: string): number | null {
  const m = SCAN_RE.exec(text.trim())
  return m ? Number.parseInt(m[1], 10) : null
}

export interface QrMatrix {
  size: number
  /** Row-major, 1 = dark module. */
  bits: number[]
}

export function qrMatrix(payload: string): QrMatrix {
  // Version 1 alphanumeric holds 20 chars at ECC M and 25 at ECC L.
  const ecc = payload.length <= 20 ? 'M' : 'L'
  const qr = QRCode.create([{ data: payload, mode: 'alphanumeric' }], { errorCorrectionLevel: ecc, version: 1 })
  const size = qr.modules.size
  const bits: number[] = new Array(size * size)
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) bits[r * size + c] = qr.modules.get(r, c) ? 1 : 0
  return { size, bits }
}

// ---------------------------------------------------------------------------
// Code 128 (sets B and C). Patterns are bar/space widths, starting with a bar.
// ---------------------------------------------------------------------------
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
]
export const CODE128_PATTERNS = PATTERNS
const START_B = 104
const START_C = 105
const CODE_C = 99
const CODE_B = 100
const STOP = 106

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9'
function digitRun(text: string, from: number): number {
  let n = 0
  while (from + n < text.length && isDigit(text[from + n])) n++
  return n
}

/** Symbol values including start, checksum and stop. Uses set C for digit runs of 4+. */
export function code128Values(text: string): number[] {
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) throw new Error(`Code 128 (set B/C) cannot encode ${JSON.stringify(ch)}`)
  }
  const values: number[] = []
  let i = 0
  let set: 'B' | 'C'
  const leading = digitRun(text, 0)
  if (leading >= 4 && leading % 2 === 0) {
    set = 'C'
    values.push(START_C)
  } else {
    set = 'B'
    values.push(START_B)
  }
  while (i < text.length) {
    if (set === 'C') {
      const run = digitRun(text, i)
      if (run >= 2) {
        values.push(Number.parseInt(text.slice(i, i + 2), 10))
        i += 2
        continue
      }
      values.push(CODE_B)
      set = 'B'
      continue
    }
    const run = digitRun(text, i)
    if (run >= 4) {
      if (run % 2 === 1) {
        values.push(text.charCodeAt(i) - 32)
        i += 1
      }
      values.push(CODE_C)
      set = 'C'
      continue
    }
    values.push(text.charCodeAt(i) - 32)
    i += 1
  }
  let sum = values[0]
  for (let k = 1; k < values.length; k++) sum += k * values[k]
  values.push(sum % 103)
  values.push(STOP)
  return values
}

/** Module sequence (1 = bar, 0 = space), without quiet zones. */
export function code128Modules(text: string): number[] {
  const out: number[] = []
  for (const v of code128Values(text)) {
    const pattern = PATTERNS[v]
    for (let k = 0; k < pattern.length; k++) {
      const w = pattern.charCodeAt(k) - 48
      const bit = k % 2 === 0 ? 1 : 0
      for (let j = 0; j < w; j++) out.push(bit)
    }
  }
  return out
}
