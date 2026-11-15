import { FlaskConical, Star } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { LiveSlip } from '@renderer/components/slip/LiveSlip'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { invoke } from '@renderer/lib/ipc'
import { useAppData } from '@renderer/lib/use-app-data'
import { DESIGNS } from '@designs/registry'
import { SAMPLE_CREATED_AT, SAMPLE_FIXTURES, SAMPLE_TZ } from '@shared/samples'
import { buildSlipModel } from '@shared/slip-model'

const SCALE = 0.4

export function DesignsPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { settings } = useAppData()
  const [fixtureId, setFixtureId] = useState('short')
  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  const fixture = SAMPLE_FIXTURES.find((f) => f.id === fixtureId) ?? SAMPLE_FIXTURES[0]
  const groups = useMemo(() => (['typographic', 'object'] as const).map((g) => ({ g, items: DESIGNS.filter((d) => d.meta.group === g) })), [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={t('designs.title')}
        subtitle={t('designs.subtitle')}
        actions={
          <Select value={fixtureId} onValueChange={setFixtureId}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLE_FIXTURES.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {t('designs.sample')}: {f.label[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-10 px-6 pb-10">
          {groups.map(({ g, items }) => (
            <section key={g}>
              <h2 className="mb-0 text-sm font-medium text-muted-foreground">{t(`designs.${g}`)}</h2>
              {/* the rail the slips hang from */}
              <div className="mt-2 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex flex-wrap items-start gap-x-6 gap-y-10">
                {items.map(({ meta }) => {
                  const model = buildSlipModel({ ...fixture.input, lang: fixture.input.lang ?? lang, card: meta.card, createdAt: SAMPLE_CREATED_AT, tz: SAMPLE_TZ })
                  const isDefault = settings?.defaultDesign === meta.id
                  return (
                    <div key={meta.id} className="group flex w-[230px] flex-col items-center">
                      <div className="h-4 w-px bg-zinc-400 dark:bg-zinc-600" />
                      <div className="h-2 w-6 rounded-sm bg-zinc-700 dark:bg-zinc-400" />
                      <div className="mt-1 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,.08),0_10px_24px_-12px_rgba(0,0,0,.35)] transition-transform group-hover:-rotate-1">
                        <LiveSlip model={model} designId={meta.id} tokens={settings?.designTokens[meta.id]} scale={SCALE * (218 / 230)} />
                      </div>
                      <div className="mt-3 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{meta.name[lang]}</span>
                          {isDefault && (
                            <Badge variant="secondary" className="shrink-0">
                              {t('designs.isDefault')}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meta.concept[lang]}</p>
                        <div className="mt-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {!isDefault && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void invoke('settings:set', { defaultDesign: meta.id })}>
                              <Star /> {t('designs.setDefault')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/playground?design=${meta.id}`)}>
                            <FlaskConical /> {t('designs.openPlayground')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
