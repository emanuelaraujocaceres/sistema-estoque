// src/lib/supabase.ts - VERSÃO DEFINITIVA
import { createClient } from '@supabase/supabase-js'

// VARIÁVEIS DE AMBIENTE - VERIFIQUE SE ESTÃO CORRETAS!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG: Mostrar variáveis (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 [SUPABASE] URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltando')
  console.log('🔧 [SUPABASE] Key:', supabaseAnonKey ? '✅ Configurada' : '❌ Faltando')
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis de ambiente do Supabase não configuradas!')
}

// 🔥🔥🔥 SINGLETON GLOBAL DEFINITIVO 🔥🔥🔥
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'supabase-auth-token-UNICO-GLOBAL' // NOME ÚNICO
  },
  global: {
    // Evita logs excessivos
    headers: {
      'X-Client-Info': 'supabase-js/2.87.0'
    }
  }
})

// DEBUG: Marcar no window para verificação
if (typeof window !== 'undefined') {
  // Remove qualquer instância anterior
  if ((window as any).__SUPABASE_SINGLETON) {
    console.warn('⚠️ Já existe uma instância anterior no window')
  }
  
  (window as any).__SUPABASE_SINGLETON = supabase
  console.log('✅ [SUPABASE] Singleton registrado como window.__SUPABASE_SINGLETON')
}

// Exportar APENAS esta instância
export { supabase }