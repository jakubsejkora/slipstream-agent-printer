/** ESC/POS command builders (Epson). All return plain byte arrays. */
export const ESC = 0x1b
export const GS = 0x1d
export const DLE = 0x10
export const EOT = 0x04

export const init = (): number[] => [ESC, 0x40] // ESC @
/** ESC J n — print and feed n motion units (1/203 in on TM-T20III, i.e. ~1 dot). */
export const feedDots = (n: number): number[] => [ESC, 0x4a, clamp(n, 0, 255)]
/** GS a n — enable Automatic Status Back. 0x0E = online/offline + errors + paper sensor. */
export const enableASB = (n = 0x0e): number[] => [GS, 0x61, n]
/** GS V 66 n — feed to cutting position + n units, then partial cut (TM-T20III has partial cut only). */
export const feedAndPartialCut = (n: number): number[] => [GS, 0x56, 66, clamp(n, 0, 255)]
/** DLE EOT n — real-time status request (n = 1 printer, 2 offline cause, 3 error cause, 4 paper). */
export const realtimeStatus = (n: 1 | 2 | 3 | 4): number[] => [DLE, EOT, n]
/** GS I n — transmit printer ID (n = 67 → model name, as a "_..." block). */
export const requestModelName = (): number[] => [GS, 0x49, 67]

/**
 * GS ( H fn 48 — request process ID response. The printer answers
 * 0x37 0x22 d1 d2 d3 d4 0x00 once all preceding data has been processed (printed + cut).
 */
export function processIdRequest(id: string): number[] {
  if (!/^[0-9]{4}$/.test(id)) throw new Error('process id must be 4 digits')
  const d = [...id].map((c) => c.charCodeAt(0))
  return [GS, 0x28, 0x48, 6, 0, 48, 48, ...d]
}

/** GS ( K fn 50 — select print speed level (1 = slowest … 13 for TM-T20III; 0 = memory switch default). */
export function printSpeed(level: number): number[] {
  return [GS, 0x28, 0x4b, 2, 0, 50, clamp(level, 0, 13)]
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(n)))
