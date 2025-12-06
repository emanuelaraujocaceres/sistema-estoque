const STORAGE_KEY = 'products_app_data';

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
    products[index] = { ...products[index], ...updatedProduct };
    saveProducts(products);
    return true;
  }
  return false;
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
      { id: 1, sku: "CAFE001", name: "Café", price: 50.00, cost: 35.00, unit: "kg", stock: 9, min_stock: 3 },
      { id: 2, sku: "COCA001", name: "Coca 350", price: 5.00, cost: 3.50, unit: "un", stock: 9, min_stock: 3 },
      { id: 3, sku: "GAS001", name: "Gasolina", price: 50.00, cost: 45.00, unit: "lt", stock: 12, min_stock: 3 }
    ];
    saveProducts(defaultProducts);
  }
}

// ================================================
// FUNÇÕES PARA VENDAS - ADICIONE ESTA PARTE
// ================================================

export function getSales() {
  try {
    const data = localStorage.getItem('sales_app_data');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return [];
  }
}

export function saveSales(sales) {
  try {
    localStorage.setItem('sales_app_data', JSON.stringify(sales));
    return true;
  } catch (error) {
    console.error('Erro ao salvar vendas:', error);
    return false;
  }
}

export function makeSale(saleData) {
  const sales = getSales();
  const newSale = {
    ...saleData,
    id: Date.now(),
    date: new Date().toISOString()
  };
  sales.push(newSale);
  saveSales(sales);
  return newSale;
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