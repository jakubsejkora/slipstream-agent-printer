import { useIpcQuery } from './ipc'

/** Shared live data used across screens (kept fresh by useLiveInvalidation). */
export function useAppData() {
  const settings = useIpcQuery('settings:get', [])
  const printer = useIpcQuery('printer:status', [])
  const queue = useIpcQuery('queue:list', [])
  const paper = useIpcQuery('paper:get', [])
  const info = useIpcQuery('app:info', [], { staleTime: Infinity })
  return { settings: settings.data, printer: printer.data, queue: queue.data, paper: paper.data, info: info.data }
}
