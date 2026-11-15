import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import type { IpcApi, IpcEventName, IpcEvents } from '@shared/ipc'

export const api = window.slipstream

export function invoke<K extends keyof IpcApi>(channel: K, ...args: Parameters<IpcApi[K]>): Promise<Awaited<ReturnType<IpcApi[K]>>> {
  return api.invoke(channel, ...args)
}

/** Subscribes to a main-process event for the component's lifetime. */
export function useIpcEvent<K extends IpcEventName>(event: K, cb: (payload: IpcEvents[K]) => void): void {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => api.on(event, (p) => ref.current(p)), [event])
}

export function useIpcQuery<K extends keyof IpcApi>(
  channel: K,
  args: Parameters<IpcApi[K]>,
  opts?: Omit<UseQueryOptions<Awaited<ReturnType<IpcApi[K]>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({ queryKey: [channel, ...args], queryFn: () => invoke(channel, ...args), ...opts })
}

/** Keeps the shared query cache fresh from main-process events. */
export function useLiveInvalidation(): void {
  const qc = useQueryClient()
  useIpcEvent('evt:printer', (s) => qc.setQueryData(['printer:status'], s))
  useIpcEvent('evt:paper', (p) => qc.setQueryData(['paper:get'], p))
  useIpcEvent('evt:settings', (s) => qc.setQueryData(['settings:get'], s))
  useIpcEvent('evt:queue', () => {
    void qc.invalidateQueries({ queryKey: ['queue:list'] })
  })
  useIpcEvent('evt:slips', () => {
    void qc.invalidateQueries({ queryKey: ['slip:list'] })
    void qc.invalidateQueries({ queryKey: ['slip:get'] })
    void qc.invalidateQueries({ queryKey: ['slip:stats'] })
    void qc.invalidateQueries({ queryKey: ['slip:nextNumber'] })
    void qc.invalidateQueries({ queryKey: ['slip:last'] })
  })
}

export function pngUrl(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes) return null
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }))
}
