// public/preload-supabase.js
// Executa ANTES do React, impede múltiplas instâncias

(function() {
  console.log('🔒 PRELOAD: Bloqueando múltiplas instâncias Supabase')
  
  // Marca que já estamos carregando
  window.__SUPABASE_PREVENT_MULTIPLE = true
  
  // Intercepta createClient se já existir
  if (window.supabase?.createClient) {
    const originalCreateClient = window.supabase.createClient
    window.supabase.createClient = function() {
      console.error('🚨 BLOQUEADO: Nova instância Supabase tentou ser criada!')
      console.trace('Stack trace:')
      return window.supabase // Retorna a existente
    }
  }
})()