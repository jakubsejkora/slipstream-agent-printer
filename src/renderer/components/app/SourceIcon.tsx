import { Bot, Brain, Code2, LayoutDashboard, PanelTop, Smartphone, SquareTerminal } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SourceKind } from '@shared/types'

const ICONS: Record<SourceKind, typeof Bot> = { menubar: PanelTop, dashboard: LayoutDashboard, api: Code2, cli: SquareTerminal, iphone: Smartphone, mcp: Bot, llm: Brain }

export function SourceIcon({ kind, className }: { kind: SourceKind; className?: string }): ReactNode {
  const Icon = ICONS[kind] ?? Code2
  return <Icon className={className ?? 'size-3.5'} />
}
