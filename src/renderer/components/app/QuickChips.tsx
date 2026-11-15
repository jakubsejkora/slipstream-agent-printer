import type { ReactNode } from 'react'
import { Badge } from '@renderer/components/ui/badge'
import type { QuickParse } from '@shared/quick-syntax'

/** Shows what quick syntax understood ("!!", "#home", "@zítra") as chips. */
export function QuickChips({ parsed, todayLabel }: { parsed: QuickParse; todayLabel: string }): ReactNode {
  if (!parsed.tokens.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {parsed.priority && <Badge variant="secondary">{'!'.repeat(parsed.priority)}</Badge>}
      {parsed.tag && <Badge variant="secondary">#{parsed.tag}</Badge>}
      {parsed.due && <Badge variant="secondary">@{parsed.due.kind === 'today' ? todayLabel : parsed.due.date}</Badge>}
    </div>
  )
}
