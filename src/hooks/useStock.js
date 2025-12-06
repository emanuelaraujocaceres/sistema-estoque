// useStock.js - Hook para estoque com PERSISTÊNCIA SUPABASE
import { useState, useEffect, useCallback } from 'react';
import { useProducts } from '../context/ProductsContext';
import { supabase } from '../services/storage'; // ⚠️ ATENÇÃO: ajuste este import!

export const useStock = () => {
  const { products: originalProducts, updateStock: updateContextStock } = useProducts();
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);

  // 🔥 FUNÇÃO PRINCIPAL: Atualizar estoque com persistência
  const updateStock = useCallback(async (productId, quantityChange) => {
    console.log(`💾 [PERSISTÊNCIA] Produto: ${productId}, Quantidade: ${quantityChange}`);
    
    try {
      setSyncStatus('saving');
      
      // 1. ATUALIZAÇÃO OTIMISTA (UI imediata)
      const updateSuccess = updateContextStock(productId, quantityChange);
      if (!updateSuccess) {
        throw new Error('Falha ao atualizar contexto local');
      }
      
      // 2. PERSISTIR NO SUPABASE
      const supabaseResult = await saveToSupabase(productId, quantityChange);
      
      if (supabaseResult.success) {
        console.log(`✅ Salvo no Supabase: ${productId}`);
        setLastSync(new Date().toISOString());
        setSyncStatus('synced');
        
        // 3. LIMPAR BACKUP LOCAL (já está no banco)
        clearLocalBackup(productId);
        
      } else {
        console.warn(`⚠️ Supabase falhou, salvando localmente: ${productId}`);
        
        // 🔥 FALLBACK: Salvar no localStorage para sincronizar depois
        saveToLocalBackup(productId, quantityChange);
        setSyncStatus('pending');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ ERRO em updateStock:', error);
      setSyncStatus('error');
      
      // 🔥 SALVAMENTO DE EMERGÊNCIA
      emergencyBackup(productId, quantityChange, error.message);
      
      return false;
    }
  }, [updateContextStock]);

  // 🔥 FUNÇÃO QUE SALVA NO SUPABASE
  const saveToSupabase = async (productId, quantityChange) => {
    try {
      // ⚠️ ⚠️ ⚠️ SUBSTITUA POR SUA LÓGICA REAL DO SUPABASE! ⚠️ ⚠️ ⚠️
      // Exemplo (descomente e ajuste):
      /*
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newStock = Math.max(0, (product.stock || 0) + quantityChange);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      // Log da operação
      await supabase
        .from('stock_logs')
        .insert({
          product_id: productId,
          quantity_change: quantityChange,
          new_stock: newStock,
          created_at: new Date().toISOString()
        });
      */
      
      // ⚠️ TEMPORÁRIO: Simula sucesso
      console.log(`📤 [SIMULAÇÃO] Supabase: ${productId}, ${quantityChange}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, newStock: null };
      
    } catch (error) {
      console.error('❌ Erro no Supabase:', error);
      return { 
        success: false, 
        error: error.message,
        queued: true 
      };
    }
  };

  // 🔥 BACKUP LOCAL (fallback)
  const saveToLocalBackup = (productId, quantityChange) => {
    try {
      const backupKey = 'pending_stock_updates';
      const pending = JSON.parse(localStorage.getItem(backupKey) || '[]');
      
      pending.push({
        productId,
        quantityChange,
        timestamp: new Date().toISOString(),
        attempts: 0
      });
      
      localStorage.setItem(backupKey, JSON.stringify(pending));
      console.log(`📦 Backup local salvo: ${productId}`);
      
    } catch (error) {
      console.error('❌ Erro no backup local:', error);
    }
  };

  // 🔥 BACKUP DE EMERGÊNCIA
  const emergencyBackup = (productId, quantityChange, errorMsg) => {
    try {
      const emergencyKey = 'emergency_stock_changes';
      const emergency = JSON.parse(localStorage.getItem(emergencyKey) || '[]');
      
      emergency.push({
        productId,
        quantityChange,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        resolved: false
      });
      
      localStorage.setItem(emergencyKey, JSON.stringify(emergency));
      console.log('🚨 Backup de emergência criado');
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO no backup de emergência:', error);
    }
  };

  // 🔥 LIMPAR BACKUP LOCAL
  const clearLocalBackup = (productId) => {
    try {
      const backupKey = 'pending_stock_updates';
      const pending = JSON.parse(localStorage.getItem(backupKey) || '[]');
      const filtered = pending.filter(item => item.productId !== productId);
      localStorage.setItem(backupKey, JSON.stringify(filtered));
      
    } catch (error) {
      // Ignora erros de limpeza
    }
  };

  // 🔥 SINCRONIZAR PENDÊNCIAS
  const syncPendingUpdates = useCallback(async () => {
    try {
      const pendingKey = 'pending_stock_updates';
      const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      
      if (pending.length === 0) {
        setSyncStatus('synced');
        return;
      }
      
      console.log(`🔄 Sincronizando ${pending.length} pendências...`);
      setSyncStatus('syncing');
      
      const successful = [];
      const failed = [];
      
      for (const item of pending) {
        if (item.attempts >= 3) {
          failed.push(item);
          continue;
        }
        
        try {
          const result = await saveToSupabase(item.productId, item.quantityChange);
          
          if (result.success) {
            successful.push(item);
            // Atualizar contexto também
            updateContextStock(item.productId, item.quantityChange);
          } else {
            item.attempts = (item.attempts || 0) + 1;
            failed.push(item);
          }
        } catch (error) {
          item.attempts = (item.attempts || 0) + 1;
          failed.push(item);
        }
      }
      
      // Atualizar fila
      localStorage.setItem(pendingKey, JSON.stringify(failed));
      setLastSync(new Date().toISOString());
      
      if (successful.length > 0) {
        console.log(`✅ ${successful.length} pendências sincronizadas`);
        setSyncStatus('synced');
      }
      if (failed.length > 0) {
        console.log(`⚠️ ${failed.length} pendências falharam`);
        setSyncStatus('partial');
      }
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      setSyncStatus('error');
    }
  }, [updateContextStock]);

  // 🔥 CONVERTER PRODUTOS (mantém sua lógica)
  const getCompatibleProducts = useCallback(() => {
    if (!originalProducts || !Array.isArray(originalProducts)) {
      return [];
    }

    return originalProducts.map(product => {
      if (!product || typeof product !== 'object') return null;

      return {
        id: product.id || product._id || `temp_${Date.now()}_${Math.random()}`,
        name: product.name || product.nome || product.productName || product.title || 'Produto sem nome',
        nome: product.name || product.nome || product.productName || product.title || 'Produto sem nome',
        stock: product.stock !== undefined ? Number(product.stock) : 
               product.estoque !== undefined ? Number(product.estoque) :
               product.quantity !== undefined ? Number(product.quantity) :
               product.quantidade !== undefined ? Number(product.quantidade) : 0,
        estoque: product.estoque !== undefined ? Number(product.estoque) :
                 product.stock !== undefined ? Number(product.stock) :
                 product.quantity !== undefined ? Number(product.quantity) :
                 product.quantidade !== undefined ? Number(product.quantidade) : 0,
        price: product.price !== undefined ? Number(product.price) :
               product.preco !== undefined ? Number(product.preco) :
               product.valor !== undefined ? Number(product.valor) : 0,
        preco: product.preco !== undefined ? Number(product.preco) :
               product.price !== undefined ? Number(product.price) :
               product.valor !== undefined ? Number(product.valor) : 0,
        sku: product.sku || product.codigo || product.code || product.reference || '',
        codigo: product.sku || product.codigo || product.code || product.reference || '',
        min_stock: product.min_stock !== undefined ? Number(product.min_stock) :
                   product.minEstoque !== undefined ? Number(product.minEstoque) :
                   product.minStock !== undefined ? Number(product.minStock) : 3,
        minEstoque: product.minEstoque !== undefined ? Number(product.minEstoque) :
                    product.min_stock !== undefined ? Number(product.min_stock) :
                    product.minStock !== undefined ? Number(product.minStock) : 3,
        ...product
      };
    }).filter(Boolean);
  }, [originalProducts]);

  const products = getCompatibleProducts();

  // 🔥 ADICIONAR AO CARRINHO
  const addToCart = useCallback(async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product || (product.stock || 0) <= 0) {
      return false;
    }

    return await updateStock(productId, -1);
  }, [products, updateStock]);

  // 🔥 ADICIONAR ESTOQUE
  const addStock = useCallback(async (productId, quantity = 1) => {
    if (quantity <= 0) return false;
    return await updateStock(productId, quantity);
  }, [updateStock]);

  // 🔥 SINCRONIZAÇÃO AUTOMÁTICA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Sincronizar ao carregar
    setTimeout(() => syncPendingUpdates(), 3000);
    
    // Sincronizar periodicamente (2 minutos)
    const interval = setInterval(() => syncPendingUpdates(), 2 * 60 * 1000);
    
    // Sincronizar ao voltar para a página
    const handleVisibilityChange = () => {
      if (!document.hidden && syncStatus !== 'syncing') {
        syncPendingUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Sincronizar antes de fechar
    const handleBeforeUnload = () => {
      if (syncStatus === 'pending') {
        console.log('💾 Salvando dados antes de sair...');
        syncPendingUpdates();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [syncPendingUpdates, syncStatus]);

  // 🔥 ESTATÍSTICAS
  const getStats = useCallback(() => {
    const inStock = products.filter(p => (p.stock || 0) > 0).length;
    const lowStock = products.filter(p => {
      const stock = p.stock || 0;
      const minStock = p.min_stock || p.minEstoque || 3;
      return stock > 0 && stock <= minStock;
    }).length;
    const outOfStock = products.filter(p => (p.stock || 0) <= 0).length;
    
    return { 
      total: products.length, 
      inStock, 
      lowStock, 
      outOfStock 
    };
  }, [products]);

  // 🔥 RETORNO COMPLETO
  return {
    products,
    updateStock,
    addToCart,
    addStock,
    syncPendingUpdates,
    syncStatus,
    lastSync,
    getStats,
    
    // Funções auxiliares
    getProductById: (id) => products.find(p => p.id === id),
    getLowStockProducts: () => products.filter(p => {
      const stock = p.stock || 0;
      const minStock = p.min_stock || p.minEstoque || 3;
      return stock > 0 && stock <= minStock;
    }),
    getOutOfStockProducts: () => products.filter(p => (p.stock || 0) <= 0),
    getInStockProducts: () => products.filter(p => (p.stock || 0) > 0),
    
    // Depuração
    debugInfo: () => ({
      totalProducts: products.length,
      syncStatus,
      lastSync,
      pendingUpdates: JSON.parse(localStorage.getItem('pending_stock_updates') || '[]').length,
      sample: products.slice(0, 2).map(p => ({ 
        id: p.id, 
        name: p.name, 
        stock: p.stock,
        hasLocalBackup: !!localStorage.getItem(`stock_backup_${p.id}`)
      }))
    })
  };
};