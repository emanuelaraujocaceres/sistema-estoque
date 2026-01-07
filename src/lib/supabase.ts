// src/lib/supabase.ts - FUNCIONA EM PRODU��O E DESENVOLVIMENTO
import { createClient } from '@supabase/supabase-js'

// ?? CREDENCIAIS DIRETAS (substitua pelas SUAS)
const CONFIG = {
  url: 'https://zywsgazlzkeawlcjxscq.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5d3NnYXpsemtlYXdsY2p4c2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMTQ4MTMsImV4cCI6MjA1MTc5MDgxM30.c_FhJzO4tq-DtxwMDQmeCbE9mZmBUKt6A3U7sIY0xEM'
}

// SINGLETON ABSOLUTO
let _instance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_instance) return _instance
  _instance = createClient(CONFIG.url, CONFIG.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'supabase-prod-singleton'
    }
  })
  
  // ?? CR�TICO: Salva no window APENAS UMA VEZ
  if (typeof window !== 'undefined') {
    // Remove qualquer outra inst�ncia
    Object.keys(window).forEach(key => {
      if (key.includes('SUPABASE') || key.includes('supabase')) {
        delete (window as any)[key]
      }
    })
    
    ;(window as any).supabase = _instance
    ;(window as any).__SUPABASE_SINGLE = _instance

  }
  
  return _instance
}

// Exporta a inst�ncia
export const supabase = getSupabase()
