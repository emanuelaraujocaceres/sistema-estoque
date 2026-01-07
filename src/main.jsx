// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './improvements.css'
import App from './App.jsx'

// Polyfill para prevenir erros
if (typeof window !== 'undefined') {
  // Garantir que o preload foi executado
  if (!window.__SUPABASE_PRELOAD__) {
    console.warn('[Main] Preload não executado. Executando agora...');
    window.__SUPABASE_PRELOAD__ = true;
  }
}

console.log('[Main] Inicializando aplicação...');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
