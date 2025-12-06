// src/services/supabaseStock.js - COMPLETO E CONFIGURADO
import { createClient } from '@supabase/supabase-js';

// 🔥 CREDENCIAIS CONFIGURADAS
const supabaseUrl = 'https://fsktcwbtzrnnkjpzfchv.supabase.co';
const supabaseKey = 'sb_publishable_y0mFmK-_hfg2yXz5DRcCHQ_zZYE-cyY';

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseStockService = {
  // 🔥 ATUALIZAR ESTOQUE NO SUPABASE
  async updateStock(productId, quantityChange) {
    try {
      console.log(`📤 [Supabase] Atualizando estoque: ${productId}, ${quantityChange}`);
      
      // 1. Buscar estoque atual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock, name, current_stock')
        .eq('id', productId)
        .single();
      
      if (fetchError) {
        // Produto não existe, criar?
        if (fetchError.code === 'PGRST116') { // No rows returned
          console.warn(`⚠️ Produto ${productId} não encontrado no Supabase`);
          return { 
            success: false, 
            error: 'Produto não encontrado no banco de dados',
            shouldCreate: true 
          };
        }
        throw fetchError;
      }
      
      // Determinar campo de estoque (stock ou current_stock)
      const currentStock = product.stock || product.current_stock || 0;
      const newStock = Math.max(0, currentStock + quantityChange);
      
      // 2. Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          current_stock: newStock, // Atualiza ambos campos para garantir
          updated_at: new Date().toISOString(),
          last_stock_update: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError);
        throw updateError;
      }
      
      // 3. Log da operação
      await this.logStockChange(productId, quantityChange, newStock, product.name);
      
      console.log(`✅ Supabase atualizado: ${productId} = ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);
      
      return { 
        success: true, 
        newStock,
        previousStock: currentStock,
        productName: product.name,
        message: 'Estoque atualizado com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro no Supabase Stock Service:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code,
        details: 'Falha na comunicação com o servidor'
      };
    }
  },

  // 🔥 LOG DE MUDANÇAS DE ESTOQUE
  async logStockChange(productId, quantityChange, newStock, productName = '') {
    try {
      const { error } = await supabase
        .from('stock_logs')
        .insert({
          product_id: productId,
          product_name: productName,
          quantity_change: quantityChange,
          previous_stock: newStock - quantityChange,
          new_stock: newStock,
          change_type: quantityChange > 0 ? 'entrada' : 'saída',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: localStorage.getItem('user_id') || localStorage.getItem('userId') || 'system',
          user_email: localStorage.getItem('user_email') || 'unknown',
          source: 'web_app',
          device_info: navigator.userAgent,
          ip_address: 'local'
        });
      
      if (error) {
        console.warn('⚠️ Falha ao loggar mudança de estoque:', error);
        // Tentar tabela alternativa
        try {
          await supabase
            .from('stock_movements')
            .insert({
              product_id: productId,
              quantity: quantityChange,
              type: quantityChange > 0 ? 'in' : 'out',
              created_at: new Date().toISOString()
            });
        } catch (secondError) {
          console.warn('⚠️ Falha também na tabela alternativa:', secondError);
        }
      }
    } catch (logError) {
      console.warn('⚠️ Erro geral no log:', logError);
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
      
      if (error) {
        // Tentar buscar por outros campos
        const { data: altData, error: altError } = await supabase
          .from('products')
          .select('*')
          .or(`id.eq.${productId},code.eq.${productId},sku.eq.${productId}`)
          .limit(1)
          .single();
          
        if (altError) throw altError;
        return { success: true, data: altData };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erro ao buscar produto:', error);
      return { 
        success: false, 
        error: error.message,
        suggestion: 'Verifique se o produto existe no banco de dados'
      };
    }
  },

  // 🔥 SINCRONIZAR DADOS LOCAIS
  async syncLocalData(localProducts) {
    try {
      if (!localProducts || !Array.isArray(localProducts)) {
        throw new Error('Dados locais inválidos para sincronização');
      }
      
      console.log(`🔄 Sincronizando ${localProducts.length} produtos...`);
      
      const updates = localProducts.map(product => ({
        id: product.id,
        name: product.name || product.nome || 'Produto sem nome',
        stock: product.stock || product.estoque || product.current_stock || 0,
        current_stock: product.stock || product.estoque || product.current_stock || 0,
        price: product.price || product.preco || product.valor || 0,
        cost: product.cost || product.custo || 0,
        min_stock: product.min_stock || product.minEstoque || product.minimum_stock || 5,
        sku: product.sku || product.codigo || product.code || '',
        barcode: product.barcode || product.codigo_barras || '',
        category: product.category || product.categoria || 'geral',
        unit: product.unit || product.unidade || 'un',
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: product.created_at || new Date().toISOString()
      }));
      
      const { data, error } = await supabase
        .from('products')
        .upsert(updates, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Erro na sincronização:', error);
        
        // Tentar inserir um por um
        let successCount = 0;
        for (const update of updates) {
          try {
            const { error: singleError } = await supabase
              .from('products')
              .upsert(update, { onConflict: 'id' });
            
            if (!singleError) successCount++;
          } catch (singleError) {
            console.warn(`⚠️ Falha ao sincronizar produto ${update.id}:`, singleError);
          }
        }
        
        console.log(`✅ ${successCount}/${updates.length} produtos sincronizados (modo individual)`);
        return { 
          success: successCount > 0, 
          count: successCount,
          total: updates.length,
          partial: successCount < updates.length
        };
      }
      
      console.log(`✅ ${updates.length} produtos sincronizados em lote`);
      return { 
        success: true, 
        count: updates.length,
        data,
        message: 'Sincronização completa'
      };
      
    } catch (error) {
      console.error('❌ Erro geral na sincronização:', error);
      return { 
        success: false, 
        error: error.message,
        count: 0 
      };
    }
  },

  // 🔥 VERIFICAR CONEXÃO
  async checkConnection() {
    try {
      const start = Date.now();
      
      // Tentar várias tabelas possíveis
      const tablesToTry = ['products', 'stock', 'items', 'produtos'];
      let lastError = null;
      
      for (const table of tablesToTry) {
        try {
          const { error } = await supabase
            .from(table)
            .select('count', { count: 'exact', head: true })
            .limit(1);
          
          if (!error) {
            const latency = Date.now() - start;
            return {
              connected: true,
              latency,
              workingTable: table,
              message: 'Conexão estabelecida com sucesso'
            };
          }
          lastError = error;
        } catch (tableError) {
          lastError = tableError;
          continue; // Tentar próxima tabela
        }
      }
      
      const latency = Date.now() - start;
      return {
        connected: false,
        latency,
        error: lastError?.message || 'Nenhuma tabela encontrada',
        suggestion: 'Verifique se as tabelas existem no Supabase'
      };
      
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error);
      return {
        connected: false,
        latency: null,
        error: error.message,
        critical: true
      };
    }
  },

  // 🔥 BUSCAR TODOS OS PRODUTOS
  async getAllProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return { 
        success: true, 
        data: data || [],
        count: data?.length || 0 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        data: [] 
      };
    }
  },

  // 🔥 CRIAR NOVO PRODUTO
  async createProduct(productData) {
    try {
      if (!productData.name) {
        throw new Error('Nome do produto é obrigatório');
      }
      
      const newProduct = {
        name: productData.name,
        stock: productData.stock || 0,
        current_stock: productData.stock || 0,
        price: productData.price || 0,
        cost: productData.cost || 0,
        min_stock: productData.min_stock || 5,
        sku: productData.sku || `SKU-${Date.now()}`,
        category: productData.category || 'geral',
        unit: productData.unit || 'un',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };
      
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Produto criado no Supabase:', data);
      return { 
        success: true, 
        data,
        message: 'Produto criado com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // 🔥 DELETAR PRODUTO
  async deleteProduct(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      // Log da exclusão
      await supabase
        .from('deleted_products')
        .insert({
          product_id: productId,
          deleted_at: new Date().toISOString(),
          deleted_by: localStorage.getItem('user_id') || 'system'
        });
      
      return { 
        success: true, 
        message: 'Produto deletado com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro ao deletar produto:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // 🔥 BUSCAR VENDAS
  async getSales(startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filtrar por data se fornecido
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { 
        success: true, 
        data: data || [],
        count: data?.length || 0 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        data: [] 
      };
    }
  },

  // 🔥 REGISTRAR VENDA
  async registerSale(saleData) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([{
          items: saleData.items,
          total: saleData.total,
          payment_method: saleData.paymentMethod || 'cash',
          created_at: new Date().toISOString(),
          user_id: localStorage.getItem('user_id') || 'system'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualizar estoque dos produtos vendidos
      for (const item of saleData.items) {
        await this.updateStock(item.productId, -item.quantity);
      }
      
      return { 
        success: true, 
        data,
        message: 'Venda registrada com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro ao registrar venda:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // 🔥 ESTATÍSTICAS
  async getStats() {
    try {
      // Contar produtos
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      // Contar produtos com estoque baixo
      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select('*')
        .lt('stock', 5);
      
      // Contar vendas do dia
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', today);
      
      const totalSalesToday = todaySales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      
      return {
        success: true,
        data: {
          totalProducts: productCount || 0,
          lowStockCount: lowStockProducts?.length || 0,
          outOfStockCount: 0, // Você pode adicionar essa lógica
          todaySales: totalSalesToday,
          todaySalesCount: todaySales?.length || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return { 
        success: false, 
        error: error.message,
        data: null 
      };
    }
  },

  // 🔥 LIMPAR DADOS DE TESTE (apenas desenvolvimento)
  async clearTestData() {
    try {
      if (!window.confirm('⚠️ PERIGO: Isso apagará TODOS os dados de teste. Continuar?')) {
        return { cancelled: true };
      }
      
      // Deletar produtos de teste
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .like('name', '%TEST%');
      
      if (deleteError) throw deleteError;
      
      return { 
        success: true, 
        message: 'Dados de teste limpos com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro ao limpar dados de teste:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
};

export default supabaseStockService;