import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './improvements.css'

// CORREÇÃO DE ENCODING DO CONSOLE - DEVE SER O PRIMEIRO
import './utils/fix-console-log.js'

// Limpar logs excessivos
import './utils/clean-logs.js'

import App from './App.jsx'

console.log('[Main] Inicializando aplicação...');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
