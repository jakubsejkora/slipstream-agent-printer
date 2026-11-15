import type { SlipstreamBridge } from './app'

declare global {
  interface Window {
    slipstream: SlipstreamBridge
  }
}
export {}
