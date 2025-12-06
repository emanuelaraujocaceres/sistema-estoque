import { useEffect, useState } from "react";
import { getProducts, makeSale, updateProduct, getProductById } from "../services/storage";
import "./Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("dinheiro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar produtos
  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    try {
      const loadedProducts = getProducts();
      if (!Array.isArray(loadedProducts)) {
        throw new Error("Dados de produtos inválidos");
      }
      setProducts(loadedProducts);
      setError(null);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setError("Erro ao carregar produtos. Verifique o console.");
      setProducts([]);
    }
  }

  function search(q) {
    try {
      if (!q || !q.trim()) return [];
      const lowerQ = q.toLowerCase().trim();
      return products.filter(p => 
        p.name && p.name.toLowerCase().includes(lowerQ)
      );
    } catch (error) {
      console.error("Erro na busca:", error);
      return [];
    }
  }

  // ✅ ADICIONAR AO CARRINHO
  function addToCart(prod) {
    try {
      if (!prod || !prod.id) {
        throw new Error("Produto inválido");
      }

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
            name: prod.name || "Produto sem nome",
            qty: 1,
            unitPrice: Number(prod.price) || 0,
            subtotal: Number(prod.price) || 0
          }
        ]);
      }

      // Atualizar lista de produtos para refletir mudança
      loadProducts();
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      alert("Erro ao adicionar produto ao carrinho");
    }
  }

  // ✅ MUDAR QUANTIDADE NO CARRINHO
  function changeQty(productId, newQty) {
    try {
      if (newQty < 1) {
        removeItem(productId);
        return;
      }

      const product = getProductById(productId);
      const item = cart.find(i => i.productId === productId);

      if (!product || !item) {
        console.warn("Produto ou item não encontrado");
        return;
      }

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

    } catch (error) {
      console.error("Erro ao alterar quantidade:", error);
      alert("Erro ao alterar quantidade do produto");
    }
  }

  // ✅ REMOVER ITEM DO CARRINHO
  function removeItem(productId) {
    try {
      const item = cart.find(i => i.productId === productId);
      if (!item) return;

      // Remover do carrinho
      setCart(cart.filter(i => i.productId !== productId));
      
    } catch (error) {
      console.error("Erro ao remover item:", error);
      alert("Erro ao remover produto do carrinho");
    }
  }

  // ✅ FINALIZAR VENDA
  async function finalize() {
    try {
      if (cart.length === 0) {
        alert("🛒 Carrinho vazio!");
        return;
      }

      const total = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const confirmMessage = `Confirmar venda?\n\nItens: ${cart.length}\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${payment}`;

      if (!window.confirm(confirmMessage)) return;

      setLoading(true);

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
      const newSale = await makeSale(saleData);

      // Feedback
      alert(`✅ Venda realizada com sucesso!\nCódigo: ${newSale.id}\nTotal: R$ ${total.toFixed(2)}`);

      // Limpar carrinho
      setCart([]);
      loadProducts();

    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert(`❌ Erro ao finalizar venda: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  // Calcular total
  const totalVenda = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // Limpar carrinho
  function clearCart() {
    if (cart.length === 0) return;
    
    if (window.confirm(`Limpar carrinho com ${cart.length} itens?`)) {
      setCart([]);
    }
  }

  return (
    <div className="sales-container">
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={loadProducts} className="button btn-sm btn-secondary">
            Tentar novamente
          </button>
        </div>
      )}

      {/* BUSCA DE PRODUTOS */}
      <div className="card search-section">
        <h2>🛒 Vender</h2>
        
        <div className="search-header">
          <input
            className="input search-input"
            placeholder="Buscar produto por nome..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
          />
          <div className="search-controls">
            <button 
              className="button btn-secondary" 
              onClick={() => setQuery("")}
              disabled={!query.trim()}
            >
              Limpar
            </button>
            <button 
              className="button btn-secondary" 
              onClick={loadProducts}
              disabled={loading}
            >
              {loading ? "Carregando..." : "🔄 Atualizar"}
            </button>
          </div>
        </div>

        <div className="products-grid">
          {search(query).map(product => (
            <div key={product.id} className="product-card">
              <div className="product-info">
                <h4>{product.name || "Produto sem nome"}</h4>
                <div className="product-price">R$ {Number(product.price || 0).toFixed(2)}</div>
                <div className={`product-stock ${product.stock <= 0 ? 'stock-out' : product.stock <= (product.min_stock || 3) ? 'stock-low' : 'stock-ok'}`}>
                  📦 Estoque: {product.stock || 0}
                </div>
              </div>
              <button
                className="button btn-primary"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0 || loading}
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
          
          {!query && products.length === 0 && (
            <div className="no-results">
              📦 Nenhum produto cadastrado. Vá para a página de Estoque para adicionar produtos.
            </div>
          )}
        </div>
      </div>

      {/* CARRINHO */}
      <div className="card cart-section">
        <div className="cart-header">
          <h2>🛍️ Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</h2>
          {cart.length > 0 && (
            <button 
              className="button btn-danger btn-sm" 
              onClick={clearCart}
              disabled={loading}
            >
              🗑️ Limpar Carrinho
            </button>
          )}
        </div>
        
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
                        Estoque disponível: {estoqueDisponivel}
                      </div>
                    </div>
                    
                    <div className="cart-item-controls">
                      <button
                        className="quantity-btn"
                        onClick={() => changeQty(item.productId, item.qty - 1)}
                        disabled={loading}
                      >
                        −
                      </button>
                      
                      <span className="quantity-display">{item.qty}</span>
                      
                      <button
                        className="quantity-btn"
                        onClick={() => changeQty(item.productId, item.qty + 1)}
                        disabled={estoqueDisponivel <= 0 || loading}
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
                      disabled={loading}
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
                  disabled={loading}
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
              
              <div className="checkout-actions">
                <button
                  className="button btn-success checkout-btn"
                  onClick={finalize}
                  disabled={loading || cart.length === 0}
                >
                  {loading ? "Processando..." : "✅ Finalizar Venda"}
                </button>
                
                <button
                  className="button btn-secondary checkout-btn"
                  onClick={clearCart}
                  disabled={loading || cart.length === 0}
                >
                  ❌ Cancelar Venda
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sales;