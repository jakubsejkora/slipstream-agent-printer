import { Download, Printer, RotateCcw, Save } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { PrintStage, type StageMode, type StageZoom } from '@renderer/components/slip/PrintStage'
import { useThermal } from '@renderer/components/slip/useThermal'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { invoke } from '@renderer/lib/ipc'
import { useAppData } from '@renderer/lib/use-app-data'
import { DESIGNS, getDesign } from '@designs/registry'
import { tokenDefaults, type TokenValues } from '@designs/types'
import type { PreviewRequest } from '@shared/ipc'
import { SAMPLE_CREATED_AT, SAMPLE_FIXTURES, SAMPLE_TZ } from '@shared/samples'
import { buildSlipModel } from '@shared/slip-model'

export function PlaygroundPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const { settings } = useAppData()
  const [params, setParams] = useSearchParams()
  const designId = params.get('design') ?? settings?.defaultDesign ?? 'terminal-pixel'
  const design = getDesign(designId)
  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  const saved = settings?.designTokens[designId] ?? {}
  const [tokens, setTokens] = useState<TokenValues>({})
  const [fixtureId, setFixtureId] = useState('all')
  const [custom, setCustom] = useState({ title: '', note: '' })
  const [mode, setMode] = useState<StageMode>('thermal')
  const [zoom, setZoom] = useState<StageZoom>('fit')
  const [grid, setGrid] = useState(false)
  useEffect(() => setTokens({ ...tokenDefaults(design.meta), ...saved }), [designId, JSON.stringify(saved)])

  const fixture = SAMPLE_FIXTURES.find((f) => f.id === fixtureId) ?? SAMPLE_FIXTURES[0]
  const model = useMemo(() => {
    const base = { ...fixture.input, lang: fixture.input.lang ?? lang }
    if (fixtureId === 'custom') Object.assign(base, { title: custom.title || t('print.titlePlaceholder'), note: custom.note || null, number: 42 })
    return buildSlipModel({ ...base, card: design.meta.card, createdAt: SAMPLE_CREATED_AT, tz: SAMPLE_TZ })
  }, [fixture, fixtureId, custom, design.meta.card, lang, t])
  const req: PreviewRequest =
    fixtureId === 'custom'
      ? { designId, title: model.title, note: model.note, tokens, lang, source: { kind: 'dashboard' } }
      : { designId, fixtureId, title: '', tokens, lang }
  const thermal = useThermal(req, true, 160)
  const changed = Object.entries(tokens).filter(([k, v]) => tokenDefaults(design.meta)[k] !== v).length

  const exportPng = async (kind: 'thermal' | 'crisp'): Promise<void> => {
    const path = await invoke('render:exportPng', { ...req, kind })
    if (path) toast.success(t('playground.exported', { path }))
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={t('playground.title')}
        subtitle={t('playground.subtitle')}
        actions={
          <Select value={designId} onValueChange={(v) => setParams({ design: v })}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESIGNS.map((d) => (
                <SelectItem key={d.meta.id} value={d.meta.id}>
                  {d.meta.name[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_260px] gap-5 px-6 pb-6">
        <ScrollArea className="min-h-0">
          <div className="space-y-5 pr-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{t('playground.tokens')}</h2>
              <span className="text-xs text-muted-foreground">{t('playground.changed', { count: changed })}</span>
            </div>
            {(design.meta.tokens ?? []).map((tok) => (
              <div key={tok.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{tok.label[lang]}</Label>
                  {tok.type === 'number' && <span className="text-xs tabular-nums text-muted-foreground">{String(tokens[tok.key] ?? tok.default)}</span>}
                  {tok.type === 'boolean' && <Switch checked={Boolean(tokens[tok.key] ?? tok.default)} onCheckedChange={(v) => setTokens((p) => ({ ...p, [tok.key]: v }))} />}
                </div>
                {tok.type === 'number' && (
                  <Slider min={tok.min ?? 0} max={tok.max ?? 100} step={tok.step ?? 1} value={[Number(tokens[tok.key] ?? tok.default)]} onValueChange={([v]) => setTokens((p) => ({ ...p, [tok.key]: v }))} />
                )}
                {tok.type === 'select' && (
                  <Select value={String(tokens[tok.key] ?? tok.default)} onValueChange={(v) => setTokens((p) => ({ ...p, [tok.key]: v }))}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tok.options?.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('printer.darkness')}</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{settings?.printer.darkness ?? 0}</span>
              </div>
              <Slider min={-40} max={40} step={2} value={[settings?.printer.darkness ?? 0]} onValueChange={([v]) => void invoke('settings:set', { printer: { darkness: v } })} />
            </div>
            <label className="flex items-center justify-between text-sm">
              {t('playground.grid')}
              <Switch checked={grid} onCheckedChange={setGrid} />
            </label>
            <div className="grid gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  void invoke('settings:set', { designTokens: { ...(settings?.designTokens ?? {}), [designId]: tokens } }).then(() => toast.success(t('playground.saved', { design: design.meta.name[lang] })))
                }}
              >
                <Save /> {t('playground.saveDefaults')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTokens(tokenDefaults(design.meta))}>
                <RotateCcw /> {t('playground.resetTokens')}
              </Button>
            </div>
          </div>
        </ScrollArea>
        <PrintStage
          mode={mode}
          onModeChange={setMode}
          zoom={zoom}
          onZoomChange={setZoom}
          model={model}
          designId={designId}
          tokens={tokens}
          thermal={thermal.result}
          thermalBusy={thermal.busy}
          phase={{ kind: 'idle' }}
          screenPxPerMm={settings?.screenPxPerMm ?? 3.78}
          showGrid={grid}
          footer={
            thermal.result && (
              <>
                <span>{t('print.info.ink', { value: Math.round(thermal.result.ink * 100) })}</span>
                {thermal.result.fits[0] && <span>{t('print.info.title', { size: thermal.result.fits[0].size, lines: thermal.result.fits[0].lines })}</span>}
                <span>{thermal.result.ms} ms</span>
              </>
            )
          }
        />
        <ScrollArea className="min-h-0">
          <div className="space-y-5 pl-2">
            <div className="space-y-2">
              <Label>{t('playground.sample')}</Label>
              <Select value={fixtureId} onValueChange={setFixtureId}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_FIXTURES.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label[lang]}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{t('playground.sampleCustom')}</SelectItem>
                </SelectContent>
              </Select>
              {fixtureId === 'custom' && (
                <div className="space-y-2">
                  <Input value={custom.title} onChange={(e) => setCustom((c) => ({ ...c, title: e.target.value }))} placeholder={t('print.titlePlaceholder')} />
                  <Input value={custom.note} onChange={(e) => setCustom((c) => ({ ...c, note: e.target.value }))} placeholder={t('print.note')} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-medium">{t('playground.lints')}</h2>
              {thermal.result && thermal.result.warnings.length === 0 && <p className="text-sm text-ok">{t('playground.noLints')}</p>}
              <div className="flex flex-wrap gap-1.5">
                {thermal.result?.warnings.map((w) => (
                  <Badge key={w} variant="outline" className="border-warn/50 text-warn">
                    {t(`print.warnings.${w}`, { defaultValue: w })}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="grid gap-2">
              <Button size="sm" variant="outline" onClick={() => void exportPng('thermal')}>
                <Download /> {t('playground.export1bit')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportPng('crisp')}>
                <Download /> {t('playground.export2x')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void invoke('slip:submit', { title: model.title, note: model.note ?? undefined, priority: model.priority ?? undefined, due: model.due, tag: model.tag, designId, source: { kind: 'dashboard' } })
                }
              >
                <Printer /> {t('playground.printTest')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
