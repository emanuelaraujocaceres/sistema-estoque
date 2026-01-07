// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Obtenha as variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Config] Verificando variáveis de ambiente...');
console.log('[Supabase Config] VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
console.log('[Supabase Config] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Definida' : '❌ Não definida');

// Singleton pattern para garantir apenas uma instância
let supabaseInstance = null;

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase: Variáveis de ambiente não configuradas!');
    console.error('   Adicione ao arquivo .env:');
    console.error('   VITE_SUPABASE_URL=sua_url_aqui');
    console.error('   VITE_SUPABASE_ANON_KEY=sua_chave_aqui');
    return null;
  }

  try {
    console.log('[Supabase] Criando cliente...');
    
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    console.log('✅ Supabase: Cliente criado com sucesso');
    
    // Armazenar para referência no window (apenas para debug)
    if (typeof window !== 'undefined') {
      if (window.supabase && window.supabase !== client) {
        console.warn('⚠️ Já existe uma instância do Supabase no window');
      }
      window.supabase = client;
      window.supabase.__instance = client; // Para o preload.js acessar
      console.log('[Supabase] Cliente registrado no window');
    }
    
    return client;
  } catch (error) {
    console.error('❌ Supabase: Erro ao criar cliente:', error);
    return null;
  }
};

// Função principal para obter a instância do Supabase
export const getSupabase = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Verificar se já existe no window (para compatibilidade)
  if (typeof window !== 'undefined' && window.supabase && window.supabase.__instance) {
    console.log('[Supabase] Usando instância existente do window');
    supabaseInstance = window.supabase.__instance;
    return supabaseInstance;
  }
  
  supabaseInstance = createSupabaseClient();
  return supabaseInstance;
};

// Exportar também como default para compatibilidade
export default getSupabase;
