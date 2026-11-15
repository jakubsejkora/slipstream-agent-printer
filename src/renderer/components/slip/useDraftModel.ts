import { useMemo } from 'react'
import { getDesign } from '@designs/registry'
import { formatLocal } from '@shared/format'
import { buildSlipModel, type SlipModel } from '@shared/slip-model'
import type { Due, Lang, Priority, Source } from '@shared/types'
import type { CardPreset } from '@shared/units'

export interface Draft {
  title: string
  note: string
  priority: Priority | null
  due: Due | null
  tag: string
  designId: string
  card: CardPreset | 'design'
}

export function useDraftModel(draft: Draft, opts: { number: number; lang: Lang; source: Source; topDeadDots: number; bottomMode: 'match' | 'minimal'; placeholder: string }): SlipModel {
  // Minute resolution keeps the model stable while typing.
  const minute = formatLocal(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
  return useMemo(() => {
    const meta = getDesign(draft.designId).meta
    return buildSlipModel({
      number: opts.number,
      title: draft.title.trim() || opts.placeholder,
      note: draft.note.trim() || null,
      priority: draft.priority,
      due: draft.due,
      tag: draft.tag.trim() || null,
      createdAt: new Date(),
      createdLocal: minute,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: opts.source,
      lang: opts.lang,
      card: draft.card === 'design' ? meta.card : draft.card,
      ghost: true,
      topDeadDots: opts.topDeadDots,
      bottomDots: opts.bottomMode === 'match' ? opts.topDeadDots : 16
    })
  }, [draft.title, draft.note, draft.priority, draft.due, draft.tag, draft.designId, draft.card, opts.number, opts.lang, opts.source, opts.topDeadDots, opts.bottomMode, opts.placeholder, minute])
}
