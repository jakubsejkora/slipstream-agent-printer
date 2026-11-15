import type { Lang } from '@shared/types'

/** Main-process strings (tray menu, notifications). The renderer uses i18next resources. */
const STRINGS = {
  en: {
    openDashboard: 'Open Slipstream',
    quickPrint: 'Quick print…',
    printTest: 'Print test page',
    pauseQueue: 'Pause printing',
    resumeQueue: 'Resume printing',
    previewOnly: 'Preview only (no paper)',
    quit: 'Quit Slipstream',
    queued: (n: number) => `${n} waiting to print`,
    printerReady: 'Printer ready',
    printerAbsent: 'Printer not connected',
    printerBack: 'Printer is back. Printing waiting slips.',
    failedTitle: 'Slip not printed',
    unconfirmedTitle: 'Slip may not have printed',
    unconfirmedBody: 'Check the paper. You can reprint it from History.',
    paperLowTitle: 'Paper is running low',
    paperLowBody: (n: number) => `About ${n} slips left on this roll.`,
    hotkeyTaken: (k: string) => `The shortcut ${k} is already used by another app. Pick another one in Settings.`
  },
  cs: {
    openDashboard: 'Otevřít Slipstream',
    quickPrint: 'Rychlý tisk…',
    printTest: 'Vytisknout zkušební stránku',
    pauseQueue: 'Pozastavit tisk',
    resumeQueue: 'Pokračovat v tisku',
    previewOnly: 'Jen náhled (bez papíru)',
    quit: 'Ukončit Slipstream',
    queued: (n: number) => `${n} čeká na tisk`,
    printerReady: 'Tiskárna připravena',
    printerAbsent: 'Tiskárna není připojena',
    printerBack: 'Tiskárna je zpět. Tisknu čekající lístky.',
    failedTitle: 'Lístek se nevytiskl',
    unconfirmedTitle: 'Lístek se možná nevytiskl',
    unconfirmedBody: 'Zkontrolujte papír. Lístek můžete dotisknout z Historie.',
    paperLowTitle: 'Dochází papír',
    paperLowBody: (n: number) => `Na roli zbývá zhruba ${n} lístků.`,
    hotkeyTaken: (k: string) => `Zkratku ${k} už používá jiná aplikace. Vyberte jinou v Nastavení.`
  }
}

export type MainStrings = (typeof STRINGS)['en']
export const strings = (lang: Lang): MainStrings => STRINGS[lang] as MainStrings
