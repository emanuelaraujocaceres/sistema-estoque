// src/utils/supabaseGuard.js
// 🔒 IMPEDE MÚLTIPLAS INSTÂNCIAS A FORÇA!

console.log('🛡️ SUPABASE GUARD ATIVADO')

// Intercepta createClient
const originalCreateClient = window.supabase?.createClient

if (originalCreateClient) {
  window.supabase.createClient = function(...args) {
    console.error('🚨 BLOQUEADO: Tentativa de criar nova instância!')
    console.error('📍 Use a instância única de src/lib/supabaseNuclear')
    console.trace('Stack trace do bloqueio:')
    
    // Retorna a instância existente
    return window.__SUPABASE_NUCLEAR
  }
}

// Verifica instâncias duplicadas
setTimeout(() => {
  console.log('🔍 Verificando instâncias duplicadas...')
  
  const instances = []
  for (const key in window) {
    if (key.includes('SUPABASE') || key.includes('supabase')) {
      instances.push(key)
    }
  }
  
  if (instances.length > 2) { // window.supabase + window.__SUPABASE_NUCLEAR
    console.error(`🚨 ${instances.length} instâncias detectadas:`, instances)
    
    // Força uso da única
    instances.forEach(key => {
      if (key !== 'supabase' && key !== '__SUPABASE_NUCLEAR') {
        window[key] = window.__SUPABASE_NUCLEAR
      }
    })
  }
}, 1000)