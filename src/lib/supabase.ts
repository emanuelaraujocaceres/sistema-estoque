import { createClient } from '@supabase/supabase-js'

// Singleton global
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabase = () => {
  if (!supabaseInstance) {
    console.log('🔧 [SUPABASE DEBUG] Criando NOVA instância Supabase singleton...')
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }

    console.log('🔧 [SUPABASE DEBUG] URL:', supabaseUrl)
    console.log('🔧 [SUPABASE DEBUG] Key starts with:', supabaseKey.substring(0, 10) + '...')

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'supabase-auth-token-singleton-unique-key'
      }
    })

    // Debug no navegador
    if (typeof window !== 'undefined') {
      if ((window as any).__SUPABASE_INSTANCE) {
        console.error('🚨 ERRO CRÍTICO: Já existe uma instância Supabase no window!')
      } else {
        (window as any).__SUPABASE_INSTANCE = supabaseInstance
        console.log('🔧 [SUPABASE DEBUG] Instância registrada no window.__SUPABASE_INSTANCE')
      }
    }
  } else {
    console.log('🔧 [SUPABASE DEBUG] Retornando instância existente')
  }
  
  return supabaseInstance
}

// Exportar a instância única
export const supabase = getSupabase()

// Helper para verificar autenticação
export const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Erro na sessão:', error)
    return null
  }
  return session
}