// public/preload-supabase.js
// Executa ANTES do React, impede múltiplas instâncias

(function() {
  console.log('🔧 PRELOAD: Bloqueando múltiplas instâncias Supabase');
  
  // Só executar no browser
  if (typeof window === 'undefined') return;
  
  // Marca que já estamos carregando
  if (window.__SUPABASE_PREVENT_MULTIPLE) {
    console.log('⚠️ Preload já executado anteriormente');
    return;
  }
  
  window.__SUPABASE_PREVENT_MULTIPLE = true;
  window.__SUPABASE_PRELOAD__ = true;
  
  console.log('✅ Preload executado com sucesso');
  
  // Intercepta createClient se já existir (proteção extra)
  if (window.supabase && typeof window.supabase === 'object') {
    const originalCreateClient = window.supabase.createClient;
    if (originalCreateClient) {
      window.supabase.createClient = function() {
        console.warn('⚠️ Tentativa de criar nova instância Supabase bloqueada!');
        console.trace('Stack trace:');
        // Retorna a instância existente ou null
        return window.supabase.__instance || null;
      };
    }
  }
})();
