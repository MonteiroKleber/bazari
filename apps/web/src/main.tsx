import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './i18n'

/**
 * Cleanup de Service Workers antigos que podem estar causando conflitos
 * Especialmente importante após mudanças na configuração de rotas
 */
async function cleanupOldServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    console.log(`[SW Cleanup] Found ${registrations.length} service worker(s)`)

    for (const registration of registrations) {
      // Força update do Service Worker
      try {
        await registration.update()
        console.log('[SW Cleanup] Updated service worker')
      } catch (err) {
        console.warn('[SW Cleanup] Failed to update SW:', err)
      }
    }

    // Se já fizemos cleanup uma vez nesta sessão, não fazer reload
    if (sessionStorage.getItem('sw-cleanup-done')) {
      return
    }

    // Marcar que fizemos cleanup
    if (registrations.length > 0) {
      sessionStorage.setItem('sw-cleanup-done', 'true')
      console.log('[SW Cleanup] Service worker cleanup complete')
    }
  } catch (err) {
    console.error('[SW Cleanup] Failed to cleanup service workers:', err)
  }
}

// Executar cleanup antes de renderizar a aplicação
cleanupOldServiceWorkers().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})