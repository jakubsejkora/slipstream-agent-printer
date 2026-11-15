import '@renderer/styles/globals.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { initI18n, resolveLang } from '@renderer/i18n'
import { invoke } from '@renderer/lib/ipc'
import { QuickApp } from './QuickApp'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 } } })

invoke('settings:get').then((settings) => {
  initI18n(resolveLang(settings.uiLanguage))
  queryClient.setQueryData(['settings:get'], settings)
  document.body.style.background = 'transparent'
  createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <QuickApp />
    </QueryClientProvider>
  )
})
