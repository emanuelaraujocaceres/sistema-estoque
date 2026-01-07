import { createClient } from '@supabase/supabase-js'

// Singleton global - NÃO exporte diretamente
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabase = () => {
  if (!supabaseInstance) {
    console.log('🔧 [SUPABASE DEBUG] Criando NOVA instância Supabase singleton...')
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'supabase-auth-token-singleton-unique-key'
      },
      global: {
        // Desabilita debug no console
        fetch: (...args) => fetch(...args)
      }
    })
  }
  
  return supabaseInstance
}

// Exportar apenas a função getter, não a instância
// export const supabase = getSupabase()  // ❌ REMOVA ESTA LINHA

// Helper para verificar autenticação
export const checkAuth = async () => {
  const supabase = getSupabase() // ✅ Obtém instância única
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Erro na sessão:', error)
    return null
  }
  return session
}