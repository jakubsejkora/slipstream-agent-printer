import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi, IpcEventName, IpcEvents } from '@shared/ipc'

const api = {
  invoke<K extends keyof IpcApi>(channel: K, ...args: Parameters<IpcApi[K]>): Promise<Awaited<ReturnType<IpcApi[K]>>> {
    return ipcRenderer.invoke(channel, ...args)
  },
  on<K extends IpcEventName>(event: K, cb: (payload: IpcEvents[K]) => void): () => void {
    const handler = (_e: unknown, payload: IpcEvents[K]): void => cb(payload)
    ipcRenderer.on(event, handler)
    return () => ipcRenderer.off(event, handler)
  }
}

contextBridge.exposeInMainWorld('slipstream', api)

export type SlipstreamBridge = typeof api
