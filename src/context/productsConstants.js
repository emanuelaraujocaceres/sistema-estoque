// Dados padrão iniciais de produtos
export const DEFAULT_PRODUCTS = [
  { 
    id: 1, 
    name: 'Café',
    sku: 'CAFE001',
    price: 50.00,
    cost: 35.00,
    stock: 4,
    min_stock: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 2, 
    name: 'Gasolina',
    sku: 'GAS001',
    price: 100.00,
    cost: 80.00,
    stock: 0,
    min_stock: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 3, 
    name: 'Cerveja Heineken 269ml',
    sku: 'CERVEJA001',
    price: 20.00,
    cost: 15.00,
    stock: 10,
    min_stock: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
];

// Chave padrão do localStorage
export const STORAGE_KEY = 'products_app_data';
