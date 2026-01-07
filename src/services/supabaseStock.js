// CORRIGIDO: Importa da instância única
import { supabase } from '../lib/supabase'; // ✅ MUDOU AQUI!

export const supabaseStockService = {
  async checkConnection() {
    try {
      const { error } = await supabase
        .from('produtos')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      return {
        connected: !error,
        error: error?.message
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
};

export default supabaseStockService;