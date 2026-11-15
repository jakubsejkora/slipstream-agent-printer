import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ThemePref = 'system' | 'light' | 'dark'
interface ThemeCtx {
  pref: ThemePref
  resolved: 'light' | 'dark'
}

const Ctx = createContext<ThemeCtx>({ pref: 'system', resolved: 'light' })
export const useTheme = (): ThemeCtx => useContext(Ctx)

/** Applies the `.dark` class from the user's preference (system by default). Slips themselves never invert. */
export function ThemeProvider({ pref, children }: { pref: ThemePref; children: ReactNode }): ReactNode {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const [systemDark, setSystemDark] = useState(mq.matches)
  useEffect(() => {
    const on = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [mq])
  const resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.style.colorScheme = resolved
  }, [resolved])
  return <Ctx.Provider value={{ pref, resolved }}>{children}</Ctx.Provider>
}
