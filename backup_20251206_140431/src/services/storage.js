// src/services/storage.js - COMPLETO E CORRIGIDO
const STORAGE_KEY = 'products_app_data';
const SALES_KEY = 'sales_app_data';

// ================================================
// FUNÇÕES PARA PRODUTOS
// ================================================

export function getProducts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      console.log('Nenhum dado encontrado no localStorage, retornando array vazio');
      return [];
    }
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn('Dados no localStorage não são um array, retornando array vazio:', parsed);
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Erro crítico ao buscar produtos:', error);
    return [];
  }
}

export function saveProducts(products) {
  try {
    if (!Array.isArray(products)) {
      console.error('Erro: Tentativa de salvar dados que não são array:', products);
      throw new Error('Produtos deve ser um array');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    console.log(`Produtos salvos: ${products.length} itens`);
    return true;
  } catch (error) {
    console.error('Erro crítico ao salvar produtos:', error);
    alert('Erro ao salvar produtos. Verifique o console para mais detalhes.');
    return false;
  }
}

export function addProduct(product) {
  try {
    if (!product || typeof product !== 'object') {
      throw new Error('Dados do produto inválidos');
    }
    
    if (!product.name || !product.name.trim()) {
      throw new Error('Nome do produto é obrigatório');
    }
    
    if (!product.price || Number(product.price) <= 0) {
      throw new Error('Preço deve ser maior que zero');
    }
    
    const products = getProducts();
    const newProduct = {
      id: product.id || Date.now(),
      name: String(product.name).trim(),
      price: Number(product.price) || 0,
      cost: Number(product.cost) || 0,
      stock: Math.max(0, Number(product.stock) || 0),
      min_stock: Math.max(0, Number(product.min_stock) || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    products.push(newProduct);
    saveProducts(products);
    
    console.log('Produto adicionado:', newProduct);
    return newProduct;
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    alert(`Erro ao adicionar produto: ${error.message}`);
    throw error;
  }
}

export function updateProduct(id, updatedProduct) {
  try {
    if (!id) {
      throw new Error('ID do produto é obrigatório');
    }
    
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error(`Produto com ID ${id} não encontrado`);
    }
    
    if (!updatedProduct.name || !updatedProduct.name.trim()) {
      throw new Error('Nome do produto é obrigatório');
    }
    
    if (!updatedProduct.price || Number(updatedProduct.price) <= 0) {
      throw new Error('Preço deve ser maior que zero');
    }
    
    const updated = {
      ...products[index],
      ...updatedProduct,
      id: id, // Garantir que o ID não seja alterado
      name: String(updatedProduct.name).trim(),
      price: Number(updatedProduct.price) || products[index].price,
      cost: Number(updatedProduct.cost) || products[index].cost,
      stock: Math.max(0, Number(updatedProduct.stock) || products[index].stock),
      min_stock: Math.max(0, Number(updatedProduct.min_stock) || products[index].min_stock),
      updated_at: new Date().toISOString()
    };
    
    products[index] = updated;
    saveProducts(products);
    
    console.log('Produto atualizado:', updated);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    alert(`Erro ao atualizar produto: ${error.message}`);
    throw error;
  }
}

export function getProductById(id) {
  try {
    if (!id && id !== 0) {
      console.warn('getProductById chamado sem ID');
      return null;
    }
    
    const products = getProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
      console.warn(`Produto com ID ${id} não encontrado`);
      return null;
    }
    
    return product;
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    return null;
  }
}

export function deleteProduct(id) {
  try {
    if (!id && id !== 0) {
      throw new Error('ID do produto é obrigatório');
    }
    
    const products = getProducts();
    const initialLength = products.length;
    
    const filtered = products.filter(p => p.id !== id);
    
    if (filtered.length === initialLength) {
      throw new Error(`Produto com ID ${id} não encontrado`);
    }
    
    saveProducts(filtered);
    
    console.log(`Produto com ID ${id} deletado`);
    return true;
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    alert(`Erro ao deletar produto: ${error.message}`);
    throw error;
  }
}

export function initDefaultProducts() {
  try {
    const current = getProducts();
    if (current.length === 0) {
      console.log('Inicializando produtos padrão...');
      
      const defaultProducts = [
        { 
          id: 1, 
          name: "Café Premium 500g", 
          price: 50.00, 
          cost: 35.00, 
          stock: 20, 
          min_stock: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: 2, 
          name: "Coca-Cola 350ml", 
          price: 5.00, 
          cost: 3.50, 
          stock: 50, 
          min_stock: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: 3, 
          name: "Gasolina Comum", 
          price: 5.80, 
          cost: 5.20, 
          stock: 1000, 
          min_stock: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      saveProducts(defaultProducts);
      console.log(`${defaultProducts.length} produtos padrão inicializados`);
    } else {
      console.log(`Já existem ${current.length} produtos, pulando inicialização padrão`);
    }
  } catch (error) {
    console.error('Erro ao inicializar produtos padrão:', error);
  }
}

export function searchProducts(query) {
  try {
    const products = getProducts();
    
    if (!query || !query.trim()) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    return products.filter(p => {
      const nameMatch = p.name && p.name.toLowerCase().includes(lowerQuery);
      const skuMatch = p.sku && p.sku.toLowerCase().includes(lowerQuery);
      return nameMatch || skuMatch;
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

// ================================================
// FUNÇÕES PARA VENDAS
// ================================================

export function getSales() {
  try {
    const data = localStorage.getItem(SALES_KEY);
    if (!data) {
      return [];
    }
    
    const parsed = JSON.parse(data);
    
    if (!Array.isArray(parsed)) {
      console.warn('Dados de vendas não são um array, retornando array vazio:', parsed);
      return [];
    }
    
    // Garantir que cada venda tenha um ID string
    return parsed.map(sale => ({
      ...sale,
      id: sale.id ? String(sale.id) : String(Date.now() + Math.random())
    }));
  } catch (error) {
    console.error('Erro crítico ao buscar vendas:', error);
    return [];
  }
}

export function saveSales(sales) {
  try {
    if (!Array.isArray(sales)) {
      throw new Error('Vendas deve ser um array');
    }
    
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    console.log(`Vendas salvas: ${sales.length} itens`);
    return true;
  } catch (error) {
    console.error('Erro crítico ao salvar vendas:', error);
    alert('Erro ao salvar vendas. Verifique o console para mais detalhes.');
    return false;
  }
}

export function makeSale(saleData) {
  try {
    console.log('Iniciando processo de venda:', saleData);
    
    if (!saleData || typeof saleData !== 'object') {
      throw new Error('Dados da venda inválidos');
    }
    
    if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
      throw new Error('A venda deve conter pelo menos um item');
    }
    
    const sales = getSales();
    const products = getProducts();
    
    // Validar todos os itens antes de processar
    const validatedItems = saleData.items.map((item, index) => {
      if (!item.productId && item.productId !== 0) {
        throw new Error(`Item ${index + 1}: ID do produto não especificado`);
      }
      
      if (!item.qty || item.qty <= 0) {
        throw new Error(`Item ${index + 1}: Quantidade inválida`);
      }
      
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`Item ${index + 1}: Produto não encontrado (ID: ${item.productId})`);
      }
      
      if (product.stock < item.qty) {
        throw new Error(`Item ${index + 1}: Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, Solicitado: ${item.qty}`);
      }
      
      return {
        productId: item.productId,
        name: item.name || product.name,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice) || Number(product.price),
        subtotal: Number(item.subtotal) || (Number(item.qty) * (Number(item.unitPrice) || Number(product.price)))
      };
    });
    
    // Calcular total
    const total = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Criar nova venda
    const newSale = {
      id: String(Date.now()),
      items: validatedItems,
      total: total,
      paymentMethod: saleData.paymentMethod || 'dinheiro',
      created_at: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    console.log('Nova venda criada:', newSale);
    
    // Atualizar estoque
    const updatedProducts = [...products];
    
    validatedItems.forEach(item => {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) {
        const newStock = updatedProducts[productIndex].stock - item.qty;
        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          stock: Math.max(0, newStock),
          updated_at: new Date().toISOString()
        };
        
        console.log(`Estoque atualizado: ${updatedProducts[productIndex].name} - Novo estoque: ${newStock}`);
      }
    });
    
    // Salvar tudo
    sales.push(newSale);
    saveSales(sales);
    saveProducts(updatedProducts);
    
    console.log('Venda processada com sucesso!');
    return newSale;
  } catch (error) {
    console.error('Erro ao processar venda:', error);
    alert(`Erro ao processar venda: ${error.message}`);
    throw error;
  }
}

export function clearSales() {
  try {
    localStorage.removeItem(SALES_KEY);
    console.log('Vendas limpas com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao limpar vendas:', error);
    return false;
  }
}

// Função para limpar todos os dados (apenas para desenvolvimento)
export function clearAllData() {
  try {
    if (window.confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados (produtos e vendas). Tem certeza?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SALES_KEY);
      console.log('Todos os dados foram limpos');
      alert('Todos os dados foram apagados. A página será recarregada.');
      window.location.reload();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    alert('Erro ao limpar dados');
    return false;
  }
}

// Função para exportar dados (backup)
export function exportData() {
  try {
    const products = getProducts();
    const sales = getSales();
    
    const data = {
      timestamp: new Date().toISOString(),
      products: products,
      sales: sales,
      total_products: products.length,
      total_sales: sales.length,
      total_sales_value: sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Backup exportado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    alert('Erro ao exportar dados');
    return false;
  }
}

// Função para importar dados
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Dados inválidos: produtos não encontrados ou formato incorreto');
    }
    
    if (!window.confirm(`Importar ${data.products.length} produtos e ${data.sales?.length || 0} vendas? Os dados atuais serão substituídos.`)) {
      return false;
    }
    
    // Salvar produtos
    saveProducts(data.products);
    
    // Salvar vendas se existirem
    if (data.sales && Array.isArray(data.sales)) {
      saveSales(data.sales);
    }
    
    alert(`Dados importados com sucesso!\n${data.products.length} produtos\n${data.sales?.length || 0} vendas`);
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    alert(`Erro ao importar dados: ${error.message}`);
    return false;
  }
}