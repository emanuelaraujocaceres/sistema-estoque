// src/lib/supabase.ts - SINGLETON DEFINITIVO CORRIGIDO
import { createClient } from '@supabase/supabase-js'

// ✅ 1. Obter variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ 2. Validação
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis de ambiente do Supabase não configuradas!')
}

// ✅ 3. VARIÁVEL GLOBAL NO MÓDULO (não no window)
let supabaseInstance: ReturnType<typeof createClient> | null = null
let initializationCount = 0

// ✅ 4. FUNÇÃO getSupabase() que controla o singleton
export function getSupabase() {
  // Se já existe a instância, retorna ela
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  // Contador para debug
  initializationCount++
  console.log(`🔧 [Supabase] Criando instância #${initializationCount}`)
  
  // Se já existe no window (HMR recarregou), usa ela
  if (typeof window !== 'undefined' && (window as any).__SUPABASE_GLOBAL) {
    console.warn('⚠️ [Supabase] Recuperando instância do window (HMR detectado)')
    supabaseInstance = (window as any).__SUPABASE_GLOBAL
    return supabaseInstance
  }
  
  // Cria nova instância
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'supabase-auth-token-app-unico-v2'
    },
    global: {
      // Headers customizados para identificar a instância
      headers: {
        'X-Client-Instance': `singleton-${Date.now()}`
      }
    }
  })
  
  // Salva no window para HMR
  if (typeof window !== 'undefined') {
    (window as any).__SUPABASE_GLOBAL = supabaseInstance
    console.log('✅ [Supabase] Instância registrada globalmente')
  }
  
  return supabaseInstance
}

// ✅ 5. Exporta a instância via getter (NÃO cria imediatamente)
export const supabase = getSupabase()

// ✅ 6. Debug helper
export function debugSupabase() {
  if (typeof window === 'undefined') return null
  
  return {
    instanceCount: initializationCount,
    windowInstance: !!(window as any).__SUPABASE_GLOBAL,
    url: supabaseUrl ? '✅ Configurada' : '❌ Faltando',
    key: supabaseAnonKey ? '✅ Configurada' : '❌ Faltando',
    isSameInstance: supabaseInstance === (window as any).__SUPABASE_GLOBAL
  }
}