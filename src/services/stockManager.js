// stockManager.js - Gerenciador ÚNICO de estoque
import { getProducts, saveProducts } from './storage';

// 🔥 CONTROLE DE TRANSAÇÕES (evita duplicação)
const TRANSACTIONS_KEY = 'processed_transactions';

class StockManager {
  constructor() {
    this.products = getProducts();
    this.transactions = this.getProcessedTransactions();
  }

  // 🔥 VERIFICAR SE TRANSAÇÃO JÁ FOI PROCESSADA
  getProcessedTransactions() {
    try {
      const data = localStorage.getItem(TRANSACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // 🔥 MARCAR TRANSAÇÃO COMO PROCESSADA
  markTransactionProcessed(transactionId) {
    this.transactions.push({
      id: transactionId,
      timestamp: Date.now()
    });
    
    // Manter apenas últimos 1000 registros
    if (this.transactions.length > 1000) {
      this.transactions = this.transactions.slice(-1000);
    }
    
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(this.transactions));
  }

  // 🔥 VERIFICAR SE JÁ FOI PROCESSADA
  isTransactionProcessed(transactionId) {
    return this.transactions.some(t => t.id === transactionId);
  }

  // 🔥 ATUALIZAR ESTOQUE COM SEGURANÇA
  updateStock(productId, quantityChange, transactionId = null) {
    console.log(`📦 Atualizando estoque: ${productId}, ${quantityChange}, Transação: ${transactionId}`);
    
    // Verificar se já processou esta transação
    if (transactionId && this.isTransactionProcessed(transactionId)) {
      console.log(`⚠️ Transação ${transactionId} já processada, ignorando...`);
      return false;
    }
    
    // Buscar produto
    const productIndex = this.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      console.error(`❌ Produto ${productId} não encontrado`);
      return false;
    }
    
    // Atualizar estoque
    const currentStock = this.products[productIndex].stock || 0;
    const newStock = Math.max(0, currentStock + quantityChange);
    
    this.products[productIndex] = {
      ...this.products[productIndex],
      stock: newStock,
      updated_at: new Date().toISOString(),
      last_update: Date.now()
    };
    
    // Salvar
    saveProducts(this.products);
    
    // Marcar transação como processada
    if (transactionId) {
      this.markTransactionProcessed(transactionId);
    }
    
    // Notificar outras telas
    this.notifyStockChange(productId, newStock, quantityChange);
    
    console.log(`✅ Estoque atualizado: ${productId} = ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);
    return true;
  }

  // 🔥 NOTIFICAR MUDANÇAS (atualiza outras telas em tempo real)
  notifyStockChange(productId, newStock, quantityChange) {
    // Disparar evento customizado
    const event = new CustomEvent('stock-changed', {
      detail: {
        productId,
        newStock,
        quantityChange,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
    
    // Forçar atualização do localStorage (dispara evento nativo)
    const temp = Date.now();
    localStorage.setItem('last_stock_update', temp.toString());
  }

  // 🔥 PROCESSAR VENDA COMPLETA (COM TRANSAÇÃO ÚNICA)
  processSale(saleData) {
    console.log('💵 Processando venda:', saleData);
    
    // Gerar ID único para esta transação
    const transactionId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Verificar se já processou
    if (this.isTransactionProcessed(transactionId)) {
      console.warn('⚠️ Esta venda já foi processada anteriormente');
      return { success: false, error: 'Venda já processada' };
    }
    
    try {
      // Validar estoque antes de processar
      for (const item of saleData.items) {
        const product = this.products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Produto ${item.productId} não encontrado`);
        }
        if ((product.stock || 0) < (item.quantity || 0)) {
          throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, Necessário: ${item.quantity}`);
        }
      }
      
      // Processar cada item
      const results = [];
      for (const item of saleData.items) {
        const success = this.updateStock(
          item.productId, 
          -item.quantity, // Negativo = saída
          `${transactionId}_item_${item.productId}`
        );
        
        if (!success) {
          throw new Error(`Falha ao processar item ${item.productId}`);
        }
        
        results.push({
          productId: item.productId,
          quantity: item.quantity,
          success: true
        });
      }
      
      // Marcar venda completa como processada
      this.markTransactionProcessed(transactionId);
      
      // Salvar registro da venda
      this.saveSaleRecord(saleData, transactionId);
      
      console.log('✅ Venda processada com sucesso:', transactionId);
      return {
        success: true,
        transactionId,
        results,
        message: 'Venda registrada com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar venda:', error);
      return {
        success: false,
        error: error.message,
        transactionId
      };
    }
  }

  // 🔥 SALVAR REGISTRO DA VENDA
  saveSaleRecord(saleData, transactionId) {
    try {
      const salesKey = 'sales_history';
      const salesHistory = JSON.parse(localStorage.getItem(salesKey) || '[]');
      
      const saleRecord = {
        id: transactionId,
        ...saleData,
        timestamp: Date.now(),
        processed_at: new Date().toISOString(),
        status: 'completed'
      };
      
      salesHistory.push(saleRecord);
      localStorage.setItem(salesKey, JSON.stringify(salesHistory));
      
      console.log('📝 Venda registrada no histórico:', transactionId);
    } catch (error) {
      console.warn('⚠️ Erro ao salvar histórico da venda:', error);
    }
  }

  // 🔥 GETTERS
  getProduct(productId) {
    return this.products.find(p => p.id === productId);
  }

  getAllProducts() {
    return [...this.products];
  }

  getStock(productId) {
    const product = this.getProduct(productId);
    return product ? (product.stock || 0) : 0;
  }

  // 🔥 SINCRONIZAR (para uso em outras telas)
  sync() {
    this.products = getProducts();
    return this.products;
  }
}

// Exportar instância única (Singleton)
export const stockManager = new StockManager();
export default stockManager;