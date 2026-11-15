/** Device profile for the Epson TM-T20III (80 mm). */
export const TM_T20III = {
  vendorId: 0x04b8,
  modelPattern: /TM-T20/i,
  widthDots: 576,
  dotsPerMm: 8,
  /** Head-to-cutter (~10.5 mm) + 1 mm pre-feed, in dots. Calibrated per printer. */
  defaultTopDeadDots: 92,
  bandRows: 800,
  /** Nominal speed 250 mm/s; used only for UI animation estimates until calibrated. */
  nominalMmPerSecond: 150,
  partialCutOnly: true
} as const
