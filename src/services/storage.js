const KEY_PRODUCTS = "@app_products_v1";
const KEY_SALES = "@app_sales_v1";

function read(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* Products API */
export function getProducts() {
  return read(KEY_PRODUCTS, []);
}

export function saveProducts(list) {
  write(KEY_PRODUCTS, list);
}

export function addProduct(product) {
  const list = getProducts();
  list.push(product);
  saveProducts(list);
}

export function updateProduct(id, updates) {
  const list = getProducts();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...updates };
  saveProducts(list);
  return true;
}

export function deleteProduct(id) {
  let list = getProducts();
  list = list.filter(p => p.id !== id);
  saveProducts(list);
}

/* Sales API */
export function getSales() {
  return read(KEY_SALES, []);
}

export function saveSales(list) {
  write(KEY_SALES, list);
}

export function makeSale(items, total, paymentType = "dinheiro") {
  const products = getProducts();
  for (const it of items) {
    const p = products.find(x => x.id === it.productId);
    if (!p) throw new Error(`Produto não encontrado: ${it.name}`);
    if (p.stock < it.qty) throw new Error(`Estoque insuficiente para ${p.name}`);
  }
  for (const it of items) {
    const idx = products.findIndex(x => x.id === it.productId);
    products[idx].stock = products[idx].stock - it.qty;
  }
  saveProducts(products);

  const sales = getSales();
  const sale = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    items,
    total,
    paymentType
  };
  sales.push(sale);
  saveSales(sales);
  return sale;
}
