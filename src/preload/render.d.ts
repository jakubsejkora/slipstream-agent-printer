import type { RenderFailure, RenderJob, RenderReady } from '@shared/render-protocol'

declare global {
  interface Window {
    slipRender: {
      onJob(cb: (job: RenderJob) => void): void
      ready(payload: RenderReady): void
      fail(payload: RenderFailure): void
      hello(): void
    }
  }
}
export {}
