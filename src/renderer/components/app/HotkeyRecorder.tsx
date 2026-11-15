import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import { Kbd } from '@renderer/components/ui/kbd'

const SYMBOLS: Record<string, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘', Space: 'Space' }

export function prettyAccelerator(acc: string): string {
  return acc
    .split('+')
    .map((p) => SYMBOLS[p] ?? p)
    .join('')
}

function toAccelerator(e: KeyboardEvent): string | null {
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command'].filter(Boolean) as string[]
  let key: string | null = null
  if (e.code === 'Space') key = 'Space'
  else if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3)
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5)
  else if (/^F\d{1,2}$/.test(e.code)) key = e.code
  if (!key || mods.length === 0) return null
  return [...mods, key].join('+')
}

/** Records an Electron accelerator from a key press (layout-independent: uses physical key codes). */
export function HotkeyRecorder({ value, onChange }: { value: string; onChange: (acc: string) => void }): ReactNode {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      if (e.key === 'Escape') return setRecording(false)
      const acc = toAccelerator(e)
      if (acc) {
        onChange(acc)
        setRecording(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, onChange])
  return (
    <div className="flex items-center gap-2">
      <Kbd className="h-8 min-w-24 justify-center px-3 text-sm">{recording ? t('settings.recording') : prettyAccelerator(value)}</Kbd>
      <Button size="sm" variant="outline" onClick={() => setRecording((r) => !r)}>
        {t('settings.record')}
      </Button>
    </div>
  )
}
