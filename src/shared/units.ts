/** Printer geometry for the Epson TM-T20III on 80 mm paper. 1 CSS px === 1 printer dot. */
export const DOTS_PER_MM = 8
export const PRINT_WIDTH_DOTS = 576
export const ROW_BYTES = PRINT_WIDTH_DOTS / 8
export const PAPER_WIDTH_MM = 80

/** Convert millimetres to whole printer dots. Never use CSS `mm` (it assumes 96 dpi). */
export const mm = (n: number): number => Math.round(n * DOTS_PER_MM)
export const dotsToMm = (dots: number): number => dots / DOTS_PER_MM

export type CardPreset = 'square' | 'card' | 'slip' | 'long' | 'poster'

export const CARD_HEIGHTS: Record<CardPreset, number> = {
  square: 576,
  card: 640,
  slip: 800,
  long: 960,
  poster: 1280
}

export const CARD_PRESETS = Object.keys(CARD_HEIGHTS) as CardPreset[]

/** Default printer calibration: head-to-cutter distance (~10.5 mm) plus the 1 mm pre-feed. */
export const DEFAULT_TOP_DEAD_ZONE_DOTS = 92

/** Physical length of the cut slip in mm: canvas + forced top blank + matching bottom feed. */
export function cutLengthMm(canvasDots: number, topDeadDots = DEFAULT_TOP_DEAD_ZONE_DOTS, bottomDots = topDeadDots): number {
  return Math.round(dotsToMm(canvasDots + topDeadDots + bottomDots))
}
