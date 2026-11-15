export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type ToneMode = 'atkinson' | 'floyd-steinberg' | 'bayer'

/** 1-bit image, one byte per pixel (1 = ink/black, 0 = paper). */
export interface Bitmap {
  width: number
  height: number
  data: Uint8Array
}

/** 1-bit image packed MSB-first, rowBytes = ceil(width / 8). Matches ESC/POS raster layout. */
export interface PackedBitmap {
  width: number
  height: number
  rowBytes: number
  data: Uint8Array
}
