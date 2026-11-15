# Slipstream: notes for coding agents

macOS Electron app (menu bar + dashboard) that prints todo slips on an Epson TM-T20III over raw USB ESC/POS. See README.md.

## Commands
- `pnpm dev:mock` runs with the virtual printer; `pnpm dev` uses USB.
- `pnpm test` runs Vitest: codes, raster, ESC/POS round-trip, queue, API, quick syntax, architecture.
- `pnpm samples` / `pnpm samples:check` render every design × fixture to `.context/samples/`. `--check` exits 1 on blocking warnings.
- Typecheck: `pnpm exec tsc --noEmit -p tsconfig.node.json && pnpm exec tsc --noEmit -p tsconfig.web.json`
- Screenshots: `SLIPSTREAM_SHOTS=$PWD/.context/shots SLIPSTREAM_TRANSPORT=mock SLIPSTREAM_USER_DATA=/tmp/slip-shots pnpm build && electron .`
  - Seeds slips.
  - Captures every page in light and dark, plus the popover.
  - `SLIPSTREAM_SHOTS_PASSES=cs` captures the Czech UI.
- Parallel builds: `SLIP_OUT_DIR=out-x pnpm exec electron-vite build`, then `electron out-x/main/index.js --render-samples --designs a,b`.

## Rules
- **Never change the code payloads or numbering:**
  - QR `SLIPSTREAM://S/00042`, Code 128 `S00042`.
  - Numbers start at #00000; a reprint keeps its number.
  - Printed slips must keep scanning.
- **Electron stays out of the core:** `src/{shared,core,raster,escpos,printer,designs}` must not import `electron` (enforced by `test/architecture.test.ts`).
- **One render path:** preview, print, export and history all use `RenderHost` (offscreen window, 576 CSS px = 576 dots). Don't add a second renderer.
- **Designs:**
  - Each design is `src/designs/<id>/{meta.ts,index.tsx}`, auto-discovered. Brief: `.context/design-brief.md` if present, otherwise the kit in `src/designs/_kit`.
  - Use whole-dot geometry, rules of at least 2 dots, and fonts that cover Czech.
  - The code rail must keep its quiet zones white.
- **Thermal limits:** ink under 30%, no colour (`hasColor` lint).
- **Strings:** add UI strings to both `src/renderer/i18n/en.ts` and `cs.ts`. Words printed on slips come from `src/shared/slip-labels.ts`.
- **USB conflicts:** the printer may be claimed by a macOS CUPS job; the manager reports `busy` and retries. Don't add Epson driver dependencies.
