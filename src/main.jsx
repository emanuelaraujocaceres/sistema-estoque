import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './improvements.css'
import App from './App.jsx'

// Limpar logs excessivos
import './utils/clean-logs.js'

// PROTEÇÃO: Verificar e prevenir erro "Link is not defined"
if (typeof window !== 'undefined') {
  // Verificar se o preload foi executado
  if (!window.__SUPABASE_PRELOAD__) {
    console.warn('[Main] Preload não executado. Verifique se preload-supabase.js está sendo carregado.');
  }
}

console.log('[Main] Inicializando aplicação...');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
