import { useEffect, useState } from "react";
import { getProducts, makeSale, updateProduct, getProductById } from "../services/storage";
import "./Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("dinheiro");

  // Carregar produtos
  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    setProducts(getProducts());
  }

  function search(q) {
    if (!q.trim()) return [];
    const lowerQ = q.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQ)
    );
  }

  // ✅ ADICIONAR AO CARRINHO E ATUALIZAR ESTOQUE EM TEMPO REAL
  function addToCart(prod) {
    // Verificar estoque
    if (prod.stock <= 0) {
      alert(`❌ ${prod.name} está sem estoque!`);
      return;
    }

    const existingItem = cart.find(item => item.productId === prod.id);
    const quantidadeDesejada = existingItem ? existingItem.qty + 1 : 1;

    // Verificar se tem estoque suficiente
    if (quantidadeDesejada > prod.stock) {
      alert(`⚠️ Estoque insuficiente!\n${prod.name}: ${prod.stock} disponíveis`);
      return;
    }

    // Atualizar carrinho
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === prod.id
          ? {
              ...item,
              qty: item.qty + 1,
              subtotal: (item.qty + 1) * item.unitPrice
            }
          : item
      ));
    } else {
      setCart([
        ...cart,
        {
          productId: prod.id,
          name: prod.name,
          qty: 1,
          unitPrice: Number(prod.price),
          subtotal: Number(prod.price)
        }
      ]);
    }

    // ✅ ATUALIZAR ESTOQUE EM TEMPO REAL NO STORAGE
    updateProduct(prod.id, {
      ...prod,
      stock: prod.stock - 1
    });

    // Atualizar lista de produtos para refletir mudança
    loadProducts();
  }

  // ✅ MUDAR QUANTIDADE NO CARRINHO E ATUALIZAR ESTOQUE
  function changeQty(productId, newQty) {
    if (newQty < 1) {
      removeItem(productId);
      return;
    }

    const product = getProductById(productId);
    const item = cart.find(i => i.productId === productId);

    if (!product || !item) return;

    const diferenca = newQty - item.qty;

    // Verificar se tem estoque suficiente para aumentar
    if (diferenca > 0 && newQty > product.stock + item.qty) {
      alert(`⚠️ Estoque insuficiente!\n${product.name}: ${product.stock} disponíveis`);
      return;
    }

    // Atualizar carrinho
    setCart(cart.map(item =>
      item.productId === productId
        ? {
            ...item,
            qty: newQty,
            subtotal: newQty * item.unitPrice
          }
        : item
    ));

    // ✅ ATUALIZAR ESTOQUE EM TEMPO REAL
    if (diferenca !== 0) {
      updateProduct(productId, {
        ...product,
        stock: product.stock - diferenca
      });
      loadProducts();
    }
  }

  // ✅ REMOVER ITEM DO CARRINHO E DEVOLVER ESTOQUE
  function removeItem(productId) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    const product = getProductById(productId);
    if (product) {
      // ✅ DEVOLVER ESTOQUE
      updateProduct(productId, {
        ...product,
        stock: product.stock + item.qty
      });
    }

    // Remover do carrinho
    setCart(cart.filter(i => i.productId !== productId));
    loadProducts();
  }

  // ✅ FINALIZAR VENDA
  async function finalize() {
    if (cart.length === 0) {
      alert("🛒 Carrinho vazio!");
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const confirmMessage = `Confirmar venda?\n\nItens: ${cart.length}\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${payment}`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        total: total,
        paymentMethod: payment
      };

      // makeSale já atualiza o estoque automaticamente
      makeSale(saleData);

      // Feedback
      alert(`✅ Venda realizada!\nTotal: R$ ${total.toFixed(2)}`);

      // Limpar carrinho
      setCart([]);
      loadProducts();

    } catch (error) {
      alert(`❌ Erro ao finalizar venda: ${error.message}`);
      console.error("Erro na venda:", error);
    }
  }

  // Calcular total
  const totalVenda = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="sales-container">
      {/* BUSCA DE PRODUTOS */}
      <div className="card search-section">
        <h2>🛒 Vender</h2>
        
        <div className="search-header">
          <input
            className="input search-input"
            placeholder="Buscar produto por nome..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="button btn-secondary" onClick={() => setQuery("")}>
            Limpar
          </button>
        </div>

        <div className="products-grid">
          {search(query).map(product => (
            <div key={product.id} className="product-card">
              <div className="product-info">
                <h4>{product.name}</h4>
                <div className="product-price">R$ {Number(product.price).toFixed(2)}</div>
                <div className={`product-stock ${product.stock <= 0 ? 'stock-out' : product.stock <= (product.min_stock || 3) ? 'stock-low' : 'stock-ok'}`}>
                  📦 Estoque: {product.stock}
                </div>
              </div>
              <button
                className="button btn-primary"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                {product.stock <= 0 ? 'Sem Estoque' : '➕ Adicionar'}
              </button>
            </div>
          ))}
          
          {query && search(query).length === 0 && (
            <div className="no-results">
              🔍 Nenhum produto encontrado para "{query}"
            </div>
          )}
        </div>
      </div>

      {/* CARRINHO */}
      <div className="card cart-section">
        <h2>🛍️ Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</h2>
        
        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="cart-icon">🛒</div>
            <p>Carrinho vazio</p>
            <p>Adicione produtos para começar uma venda</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => {
                const product = getProductById(item.productId);
                const estoqueDisponivel = product?.stock || 0;
                
                return (
                  <div key={item.productId} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-details">
                        R$ {item.unitPrice.toFixed(2)}/un • 
                        Estoque: {estoqueDisponivel + item.qty} (disponível: {estoqueDisponivel})
                      </div>
                    </div>
                    
                    <div className="cart-item-controls">
                      <button
                        className="quantity-btn"
                        onClick={() => changeQty(item.productId, item.qty - 1)}
                      >
                        −
                      </button>
                      
                      <span className="quantity-display">{item.qty}</span>
                      
                      <button
                        className="quantity-btn"
                        onClick={() => changeQty(item.productId, item.qty + 1)}
                        disabled={estoqueDisponivel <= 0}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="cart-item-subtotal">
                      R$ {item.subtotal.toFixed(2)}
                    </div>
                    
                    <button
                      className="remove-btn"
                      onClick={() => removeItem(item.productId)}
                      title="Remover do carrinho"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <div className="payment-section">
                <label>💳 Forma de Pagamento:</label>
                <select
                  className="payment-select"
                  value={payment}
                  onChange={e => setPayment(e.target.value)}
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">🏦 PIX</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                </select>
              </div>
              
              <div className="total-section">
                <div className="total-label">💰 Total da Venda:</div>
                <div className="total-amount">R$ {totalVenda.toFixed(2)}</div>
              </div>
              
              <button
                className="button btn-success checkout-btn"
                onClick={finalize}
              >
                ✅ Finalizar Venda
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sales;