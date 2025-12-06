const STORAGE_KEY = 'products_app_data';
const SALES_KEY = 'sales_app_data';

// ================================================
// FUNÇÕES PARA PRODUTOS
// ================================================

export function getProducts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

export function saveProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    console.error('Erro ao salvar produtos:', error);
    return false;
  }
}

export function addProduct(product) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
  return product;
}

export function updateProduct(id, updatedProduct) {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    // Garantir que o ID não seja alterado
    updatedProduct.id = id;
    products[index] = { ...products[index], ...updatedProduct };
    saveProducts(products);
    return true;
  }
  return false;
}

export function getProductById(id) {
  const products = getProducts();
  return products.find(p => p.id === id);
}

export function deleteProduct(id) {
  const products = getProducts();
  const filtered = products.filter(p => p.id !== id);
  saveProducts(filtered);
  return true;
}

export function initDefaultProducts() {
  const current = getProducts();
  if (current.length === 0) {
    const defaultProducts = [
      { id: 1, name: "Café", price: 50.00, cost: 35.00, stock: 9, min_stock: 3 },
      { id: 2, name: "Coca 350", price: 5.00, cost: 3.50, stock: 9, min_stock: 3 },
      { id: 3, name: "Gasolina", price: 50.00, cost: 45.00, stock: 12, min_stock: 3 }
    ];
    saveProducts(defaultProducts);
  }
}

export function searchProducts(query) {
  const products = getProducts();
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) || 
    (p.sku && p.sku.toLowerCase().includes(lowerQuery))
  );
}

// ================================================
// FUNÇÕES PARA VENDAS (CORRIGIDAS)
// ================================================

export function getSales() {
  try {
    const data = localStorage.getItem(SALES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return [];
  }
}

export function saveSales(sales) {
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    return true;
  } catch (error) {
    console.error('Erro ao salvar vendas:', error);
    return false;
  }
}

// FUNÇÃO CRÍTICA: makeSale que também atualiza estoque
export function makeSale(saleData) {
  try {
    const sales = getSales();
    
    // Garantir que o ID seja uma STRING (para evitar erro no Reports.jsx)
    const newSale = {
      ...saleData,
      id: String(Date.now()), // ← AGORA É STRING
      created_at: new Date().toISOString() // ← Usar created_at (compatível com Reports.jsx)
    };
    
    sales.push(newSale);
    saveSales(sales);
    
    // ✅ ATUALIZAR ESTOQUE DOS PRODUTOS VENDIDOS
    if (newSale.items && Array.isArray(newSale.items)) {
      const products = getProducts();
      
      newSale.items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          // Reduzir estoque
          const currentStock = products[productIndex].stock || 0;
          const quantidadeVendida = item.qty || item.quantity || 0;
          const novoEstoque = Math.max(0, currentStock - quantidadeVendida);
          
          products[productIndex] = {
            ...products[productIndex],
            stock: novoEstoque
          };
        }
      });
      
      // Salvar produtos com estoque atualizado
      saveProducts(products);
    }
    
    return newSale;
  } catch (error) {
    console.error('Erro ao processar venda:', error);
    throw error;
  }
}

// Função para limpar todas as vendas (útil para testes)
export function clearSales() {
  localStorage.removeItem(SALES_KEY);
  return true;
}