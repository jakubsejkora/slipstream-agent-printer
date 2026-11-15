import { Copy, FolderOpen, Printer, RefreshCw, Terminal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HotkeyRecorder } from '@renderer/components/app/HotkeyRecorder'
import { PageHeader } from '@renderer/components/app/PageHeader'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Separator } from '@renderer/components/ui/separator'
import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { invoke, useIpcQuery } from '@renderer/lib/ipc'
import { useAppData } from '@renderer/lib/use-app-data'
import type { DeepPartial, Settings } from '@shared/settings'
import { CARD_PRESETS } from '@shared/units'

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="grid grid-cols-[200px_1fr] gap-8 py-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 space-y-0.5">
        <Label>{label}</Label>
        {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Secret({ value }: { value: string }): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5">
      <Input readOnly value={value} className="h-8 w-72 font-mono text-xs" type="password" />
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        onClick={() => {
          void navigator.clipboard.writeText(value)
          toast(t('common.copied'))
        }}
      >
        <Copy />
      </Button>
    </div>
  )
}

export function SettingsPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const { settings: s, info } = useAppData()
  const designs = useIpcQuery('design:list', [])
  const api = useIpcQuery('api:info', [])
  const [cardMm, setCardMm] = useState<number | null>(null)
  if (!s) return null
  const set = (patch: DeepPartial<Settings>): void => {
    void invoke('settings:set', patch).then(() => api.refetch())
  }
  const lang = i18n.language === 'cs' ? 'cs' : 'en'
  const pxPerMm = cardMm ?? s.screenPxPerMm

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={t('settings.title')} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y px-6 pb-10">
          <Section title={t('settings.general')}>
            <Field label={t('settings.language')}>
              <Select value={s.uiLanguage} onValueChange={(v) => set({ uiLanguage: v as Settings['uiLanguage'] })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('settings.languageSystem')}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="cs">Čeština</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.hotkey')} hint={info && !info.hotkeyRegistered ? t('settings.hotkeyFailed') : t('settings.hotkeyHint')}>
              <HotkeyRecorder value={s.hotkey} onChange={(hotkey) => set({ hotkey })} />
            </Field>
            <Field label={t('settings.launchAtLogin')}>
              <Switch checked={s.launchAtLogin} onCheckedChange={(v) => set({ launchAtLogin: v })} />
            </Field>
          </Section>

          <Section title={t('settings.slips')}>
            <Field label={t('settings.defaultDesign')}>
              <Select value={s.defaultDesign} onValueChange={(v) => set({ defaultDesign: v })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designs.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.defaultCard')}>
              <Select value={s.defaultCard} onValueChange={(v) => set({ defaultCard: v as Settings['defaultCard'] })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">{t('print.cardDesign')}</SelectItem>
                  {CARD_PRESETS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`cards.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.slipLanguage')} hint={t('settings.slipLanguageHint')}>
              <Select value={s.slipLanguage} onValueChange={(v) => set({ slipLanguage: v as Settings['slipLanguage'] })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">{t('settings.slipLanguageApp')}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="cs">Čeština</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('settings.quickSyntax')} hint={t('settings.quickSyntaxHint')}>
              <Switch checked={s.quickSyntax} onCheckedChange={(v) => set({ quickSyntax: v })} />
            </Field>
            <Field label={t('settings.recap')} hint={t('settings.recapHint')}>
              <div className="flex items-center gap-2">
                <Input type="time" value={s.recap.time} onChange={(e) => set({ recap: { time: e.target.value } })} className="h-8 w-28" disabled={!s.recap.enabled} />
                <Switch checked={s.recap.enabled} onCheckedChange={(v) => set({ recap: { enabled: v } })} />
              </div>
            </Field>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => void invoke('recap:printNow')}>
                <Printer /> {t('settings.recapNow')}
              </Button>
            </div>
          </Section>

          <Section title={t('settings.network')}>
            <Field label={t('settings.apiEnabled')} hint={t('settings.apiHint')}>
              <Switch checked={s.api.enabled} onCheckedChange={(v) => set({ api: { enabled: v } })} />
            </Field>
            {api.data && s.api.enabled && (
              <div className="space-y-3 rounded-md border p-4">
                <Field label={t('settings.apiUrl')}>
                  <code className="text-xs">{api.data.url}</code>
                </Field>
                <Field label={t('settings.token')}>
                  <div className="flex items-center gap-1.5">
                    <Secret value={api.data.token} />
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => void invoke('api:rotateToken', 'local').then(() => api.refetch())} aria-label={t('settings.rotate')}>
                      <RefreshCw />
                    </Button>
                  </div>
                </Field>
              </div>
            )}
            <Field label={t('settings.lan')} hint={t('settings.lanHint')}>
              <Switch checked={s.api.lanEnabled} onCheckedChange={(v) => set({ api: { lanEnabled: v } })} disabled={!s.api.enabled} />
            </Field>
            {api.data && s.api.lanEnabled && (
              <div className="space-y-3 rounded-md border p-4">
                <Field label={t('settings.lanUrl')}>
                  <code className="text-xs">{api.data.lanUrl ?? '–'}</code>
                </Field>
                <Field label={t('settings.token')}>
                  <div className="flex items-center gap-1.5">
                    <Secret value={api.data.lanToken} />
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => void invoke('api:rotateToken', 'lan').then(() => api.refetch())} aria-label={t('settings.rotate')}>
                      <RefreshCw />
                    </Button>
                  </div>
                </Field>
                <div>
                  <Label>{t('settings.iphoneRecipe')}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{t('settings.iphoneSteps', { url: api.data.lanUrl ?? '' })}</p>
                </div>
              </div>
            )}
            <Field label={t('settings.cli')} hint={t('settings.cliHint')}>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => void invoke('cli:install', 'user').then((p) => toast.success(t('settings.cliInstalled', { path: p })), (e) => toast.error(String(e)))}>
                    <Terminal /> {t('settings.cliInstallUser')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void invoke('cli:install', 'system').then((p) => toast.success(t('settings.cliInstalled', { path: p })), (e) => toast.error(String(e)))}>
                    {t('settings.cliInstallSystem')}
                  </Button>
                </div>
                {api.data?.cliInstalled && <span className="text-xs text-ok">{t('settings.cliInstalled', { path: api.data.cliInstalled })}</span>}
              </div>
            </Field>
          </Section>

          <Section title={t('settings.appearance')}>
            <Field label={t('settings.theme')}>
              <ToggleGroup type="single" variant="outline" size="sm" value={s.theme} onValueChange={(v) => v && set({ theme: v as Settings['theme'] })}>
                {(['system', 'light', 'dark'] as const).map((th) => (
                  <ToggleGroupItem key={th} value={th} className="px-3 text-xs">
                    {t(`settings.themes.${th}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field label={t('settings.screenCalibration')} hint={t('settings.screenCalibrationHint')}>
              <div className="w-72 space-y-3">
                {/* ISO/IEC 7810 ID-1 card: 85.60 × 53.98 mm */}
                <div className="rounded-[10px] border-2 border-dashed border-muted-foreground/60" style={{ width: 85.6 * pxPerMm, height: 53.98 * pxPerMm, maxWidth: '100%' }} />
                <Slider min={2.5} max={6} step={0.01} value={[pxPerMm]} onValueChange={([v]) => setCardMm(v)} onValueCommit={([v]) => set({ screenPxPerMm: v })} />
              </div>
            </Field>
          </Section>

          <Section title={t('settings.data')}>
            <Field label={t('settings.openData')}>
              <Button size="sm" variant="outline" onClick={() => void invoke('app:openData')}>
                <FolderOpen /> {t('common.open')}
              </Button>
            </Field>
            <Field label={t('settings.danger')} hint={t('settings.dangerHint')}>
              <span />
            </Field>
          </Section>

          <Section title={t('settings.about')}>
            <p className="text-sm">{t('settings.version', { version: info?.version ?? '' })}</p>
            <p className="text-xs text-muted-foreground">{t('settings.licenses')}</p>
          </Section>
          <Separator className="hidden" />
        </div>
      </ScrollArea>
    </div>
  )
}
