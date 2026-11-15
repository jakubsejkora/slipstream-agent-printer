import { join, resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@shared': resolve(import.meta.dirname, 'src/shared'),
  '@core': resolve(import.meta.dirname, 'src/core'),
  '@raster': resolve(import.meta.dirname, 'src/raster'),
  '@escpos': resolve(import.meta.dirname, 'src/escpos'),
  '@printer': resolve(import.meta.dirname, 'src/printer'),
  '@designs': resolve(import.meta.dirname, 'src/designs'),
  '@renderer': resolve(import.meta.dirname, 'src/renderer')
}

/** Dev only: Vite's React refresh preamble is an inline script, which the production CSP (correctly) blocks. */
const devCsp = (): Plugin => ({
  name: 'slipstream-dev-csp',
  apply: 'serve',
  transformIndexHtml: (html) => html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
})

// SLIP_OUT_DIR lets parallel builds (e.g. design previews) use separate output folders.
const outBase = resolve(import.meta.dirname, process.env.SLIP_OUT_DIR ?? 'out')

export default defineConfig({
  main: {
    resolve: { alias },
    build: {
      outDir: join(outBase, 'main'),
      rolldownOptions: {
        input: { index: resolve(import.meta.dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    resolve: { alias },
    build: {
      // Sandboxed preloads cannot require node_modules, so bundle everything.
      externalizeDeps: false,
      outDir: join(outBase, 'preload'),
      rolldownOptions: {
        input: {
          app: resolve(import.meta.dirname, 'src/preload/app.ts'),
          render: resolve(import.meta.dirname, 'src/preload/render.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    resolve: { alias },
    plugins: [react(), tailwindcss(), devCsp()],
    build: {
      outDir: join(outBase, 'renderer'),
      rolldownOptions: {
        input: {
          dashboard: resolve(import.meta.dirname, 'src/renderer/dashboard.html'),
          quick: resolve(import.meta.dirname, 'src/renderer/quick.html'),
          render: resolve(import.meta.dirname, 'src/renderer/render.html')
        }
      }
    }
  }
})
