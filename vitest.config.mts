import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@core': resolve(import.meta.dirname, 'src/core'),
      '@raster': resolve(import.meta.dirname, 'src/raster'),
      '@escpos': resolve(import.meta.dirname, 'src/escpos'),
      '@printer': resolve(import.meta.dirname, 'src/printer'),
      '@designs': resolve(import.meta.dirname, 'src/designs')
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
