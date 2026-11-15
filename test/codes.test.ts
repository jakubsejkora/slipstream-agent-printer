import { describe, expect, it } from 'vitest'
import { CODE128_PATTERNS, code128Modules, code128Values, formatNumber, parseScan, qrMatrix, qrPayload, shortCode } from '@shared/codes'
import { decodeCodes } from '@raster/selftest'
import { drawRail } from './helpers'

describe('slip identity', () => {
  it('pads numbers to five digits and grows beyond', () => {
    expect(formatNumber(0)).toBe('00000')
    expect(formatNumber(42)).toBe('00042')
    expect(formatNumber(100000)).toBe('100000')
    expect(shortCode(42)).toBe('S00042')
    expect(qrPayload(42)).toBe('SLIPSTREAM://S/00042')
  })

  it('parses both payload forms, case-insensitively', () => {
    expect(parseScan('SLIPSTREAM://S/00042')).toBe(42)
    expect(parseScan('slipstream://s/00042')).toBe(42)
    expect(parseScan('S00042')).toBe(42)
    expect(parseScan(' s100000 ')).toBe(100000)
    expect(parseScan('S42')).toBeNull()
    expect(parseScan('hello')).toBeNull()
  })
})

describe('QR', () => {
  it('is always version 1 (21×21) for 5- and 6-digit numbers', () => {
    expect(qrMatrix(qrPayload(0)).size).toBe(21)
    expect(qrMatrix(qrPayload(99999)).size).toBe(21)
    expect(qrMatrix(qrPayload(123456)).size).toBe(21)
  })
})

describe('Code 128', () => {
  it('has well-formed pattern table', () => {
    expect(CODE128_PATTERNS).toHaveLength(107)
    CODE128_PATTERNS.forEach((p, i) => {
      const sum = [...p].reduce((n, c) => n + Number(c), 0)
      expect(sum, `pattern ${i}`).toBe(i === 106 ? 13 : 11)
    })
  })

  it('encodes S00042 as Start B, S, 0, Code C, 00, 42, check, stop', () => {
    expect(code128Values('S00042')).toEqual([104, 51, 16, 99, 0, 42, 76, 106])
  })

  it('is always 90 modules wide for 5- and 6-digit slip codes', () => {
    for (const n of [0, 1, 42, 9999, 54321, 99999, 100000, 123456]) expect(code128Modules(shortCode(n))).toHaveLength(90)
  })
})

describe('code rail decodes with zxing', () => {
  it('reads QR and Code 128 back from a 1-bit rail', async () => {
    for (const n of [0, 42, 98765]) {
      const bm = drawRail(qrPayload(n), shortCode(n))
      const res = await decodeCodes(bm)
      expect(res.qr).toBe(qrPayload(n))
      expect(res.code128).toBe(shortCode(n))
      const gained = await decodeCodes(bm, { dilate: true })
      expect(gained.qr).toBe(qrPayload(n))
      expect(gained.code128).toBe(shortCode(n))
    }
  })
})
