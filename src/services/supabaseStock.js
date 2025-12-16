// src/services/supabaseStock.js - Wrapper simplificado
// Usa supabaseSync.js para todas as operações
import supabase from '../services/supabaseClient';

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
