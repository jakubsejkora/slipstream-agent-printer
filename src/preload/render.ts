import { contextBridge, ipcRenderer } from 'electron'
import type { RenderFailure, RenderJob, RenderReady } from '@shared/render-protocol'

contextBridge.exposeInMainWorld('slipRender', {
  onJob: (cb: (job: RenderJob) => void) => {
    ipcRenderer.on('rh:job', (_e, job: RenderJob) => cb(job))
  },
  ready: (payload: RenderReady) => ipcRenderer.send('rh:ready', payload),
  fail: (payload: RenderFailure) => ipcRenderer.send('rh:error', payload),
  hello: () => ipcRenderer.send('rh:hello')
})
