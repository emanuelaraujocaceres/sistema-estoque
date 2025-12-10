import { createClient } from '@supabase/supabase-js'

// Singleton para evitar múltiplas instâncias do GoTrueClient
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper para verificar autenticação
export const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
        console.error('Erro na sessão:', error)
        return null
    }
    return session
}
