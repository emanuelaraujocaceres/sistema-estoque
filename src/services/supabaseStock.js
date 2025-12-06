// supabaseStock.js - Serviço dedicado para operações de estoque no Supabase
import { supabase } from './storage'; // Ajuste conforme seu arquivo

export const supabaseStockService = {
  // 🔥 ATUALIZAR ESTOQUE NO SUPABASE
  async updateStock(productId, quantityChange) {
    try {
      console.log(`📤 [Supabase] Atualizando estoque: ${productId}, ${quantityChange}`);
      
      // 1. Buscar estoque atual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock, name')
        .eq('id', productId)
        .single();
      
      if (fetchError) {
        // Produto não existe, criar?
        if (fetchError.code === 'PGRST116') { // No rows returned
          console.warn(`⚠️ Produto ${productId} não encontrado no Supabase`);
          return { 
            success: false, 
            error: 'Produto não encontrado',
            shouldCreate: true 
          };
        }
        throw fetchError;
      }
      
      const currentStock = product.stock || 0;
      const newStock = Math.max(0, currentStock + quantityChange);
      
      // 2. Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      // 3. Log da operação
      await this.logStockChange(productId, quantityChange, newStock, product.name);
      
      console.log(`✅ Supabase atualizado: ${productId} = ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);
      
      return { 
        success: true, 
        newStock,
        previousStock: currentStock,
        productName: product.name 
      };
      
    } catch (error) {
      console.error('❌ Erro no Supabase Stock Service:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  },

  // 🔥 LOG DE MUDANÇAS DE ESTOQUE
  async logStockChange(productId, quantityChange, newStock, productName = '') {
    try {
      await supabase
        .from('stock_logs')
        .insert({
          product_id: productId,
          product_name: productName,
          quantity_change: quantityChange,
          previous_stock: newStock - quantityChange,
          new_stock: newStock,
          created_at: new Date().toISOString(),
          user_id: localStorage.getItem('user_id') || 'system',
          source: 'app'
        });
    } catch (logError) {
      console.warn('⚠️ Falha ao loggar mudança de estoque:', logError);
      // Não falhar a operação principal por causa do log
    }
  },

  // 🔥 BUSCAR PRODUTO POR ID
  async getProduct(productId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 🔥 SINCRONIZAR DADOS LOCAIS
  async syncLocalData(localProducts) {
    try {
      console.log(`🔄 Sincronizando ${localProducts.length} produtos...`);
      
      const updates = localProducts.map(product => ({
        id: product.id,
        stock: product.stock || product.estoque || 0,
        name: product.name || product.nome,
        price: product.price || product.preco || 0,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('products')
        .upsert(updates, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
      
      console.log(`✅ ${updates.length} produtos sincronizados`);
      return { success: true, count: updates.length };
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      return { success: false, error: error.message };
    }
  },

  // 🔥 VERIFICAR CONEXÃO
  async checkConnection() {
    try {
      const start = Date.now();
      const { error } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      const latency = Date.now() - start;
      
      return {
        connected: !error,
        latency,
        error: error?.message
      };
    } catch (error) {
      return {
        connected: false,
        latency: null,
        error: error.message
      };
    }
  }
};

export default supabaseStockService;