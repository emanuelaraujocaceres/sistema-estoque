// src/lib/supabaseSingleton.js
// ✅ ÚNICA FONTE DA VERDADE
import { createClient } from '@supabase/supabase-js'

let _instance = null
let _initCount = 0

export function getSupabase() {
  if (_instance) {
    console.log('♻️ [Singleton] Reutilizando instância existente')
    return _instance
  }
  
  console.log(`🔧 [Singleton] Criando instância #${++_initCount}`)
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas!')
  }
  
  _instance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'supabase-singleton-app-unique'
    }
  })
  
  // Debug: registra no window
  if (typeof window !== 'undefined') {
    if (window.__SUPABASE_INSTANCES) {
      window.__SUPABASE_INSTANCES.push(_instance)
    } else {
      window.__SUPABASE_INSTANCES = [_instance]
    }
    console.log('📊 Instâncias no window:', window.__SUPABASE_INSTANCES.length)
  }
  
  return _instance
}

// Exporta a instância singleton
export const supabase = getSupabase()