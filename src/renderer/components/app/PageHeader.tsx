import type { ReactNode } from 'react'

/** Page title row; doubles as the window drag region under the hidden title bar. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): ReactNode {
  return (
    <header className="drag flex shrink-0 items-end justify-between gap-4 px-6 pb-4 pt-5">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="no-drag flex items-center gap-2">{actions}</div>}
    </header>
  )
}
