// CORRIGIDO: Importa da instÃ¢ncia Ãºnica
import { supabase } from '../lib/supabase.ts'; // âœ… MUDOU AQUI!

export const supabaseStockService = {
  async checkConnection() {
    try {
      const { error } = await supabase
        .from('produtos')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao verificar conexão com Supabase:', error);
        return {
          connected: false,
          error: error.message,
        };
      }

      return {
        connected: true,
        error: null,
      };
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar conexão com Supabase:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  },
};

export default supabaseStockService;
