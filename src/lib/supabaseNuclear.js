// src/lib/supabaseNuclear.js
// 🔥 NÃO USA .env, NÃO USA import.meta - FUNCIONA SEMPRE!

console.log('💣 SUPABASE NUCLEAR INICIANDO...')

// 🔥 SUAS CREDENCIAIS DIRETO NO CÓDIGO (substitua pelos SEUS valores)
const SUPABASE_CONFIG = {
  // ⚠️ SUBSTITUA ESTES VALORES PELOS SEUS REAIS! ⚠️
  url: 'https://SEU-PROJETO.supabase.co',  // ← SUA URL AQUI
  key: 'SUA-CHAVE-ANONIMA-LONGA-AQUI'      // ← SUA CHAVE AQUI
}

// Validação
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.key) {
  const error = '🚨 ERRO: Configure as credenciais do Supabase em supabaseNuclear.js!'
  console.error(error)
  
  // Mostra erro VISÍVEL
  const div = document.createElement('div')
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #c0392b;
    color: white;
    padding: 20px;
    z-index: 99999;
    font-family: monospace;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `
  div.innerHTML = `
    <h3>🚨 CONFIGURAÇÃO NECESSÁRIA</h3>
    <p>Abra o arquivo <strong>src/lib/supabaseNuclear.js</strong></p>
    <p>Substitua as credenciais placeholder pelas suas reais:</p>
    <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
url: 'https://SEU-PROJETO.supabase.co',  // ← SUA URL AQUI
key: 'SUA-CHAVE-ANONIMA-LONGA-AQUI'      // ← SUA CHAVE AQUI
    </pre>
    <button onclick="location.reload()" style="
      background: white;
      color: #c0392b;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 10px;
    ">
      🔄 Recarregar após configurar
    </button>
  `
  document.body.appendChild(div)
  throw new Error(error)
}

console.log('✅ Credenciais configuradas:', {
  url: SUPABASE_CONFIG.url.substring(0, 30) + '...',
  key: SUPABASE_CONFIG.key.substring(0, 10) + '...'
})

// Importa e cria o cliente
import { createClient } from '@supabase/supabase-js'

console.log('🔧 Criando cliente Supabase...')

// 🔥 SINGLETON ABSOLUTO
let instance = null

function getSupabase() {
  if (instance) {
    return instance
  }
  
  console.log('🚀 Criando NOVA instância nuclear')
  
  instance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'supabase-nuclear-singleton-' + Math.random().toString(36).substr(2, 9)
    }
  })
  
  // 🔥 FORÇA NO WINDOW - IMPEDE MÚLTIPLAS INSTÂNCIAS
  if (typeof window !== 'undefined') {
    // Remove qualquer instância anterior
    Object.keys(window).forEach(key => {
      if (key.includes('SUPABASE') || key.includes('supabase')) {
        delete window[key]
      }
    })
    
    window.supabase = instance
    window.__SUPABASE_NUCLEAR = instance
    window.__SUPABASE_NUCLEAR_CONFIG = SUPABASE_CONFIG
    
    console.log('✅ Instância nuclear registrada no window')
  }
  
  return instance
}

// Cria e exporta
const supabase = getSupabase()

console.log('🎉 Supabase Nuclear pronto!')
console.log('🔍 Teste: supabase.auth disponível?', !!supabase.auth)

// Exporta
export { supabase }
export default supabase