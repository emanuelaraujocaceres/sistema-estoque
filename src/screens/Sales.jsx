import { useEffect, useState } from "react";
import { makeSale } from "../services/storage";
import { useStock } from '../hooks/useStock';
import "./Sales.css";

function Sales() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("dinheiro");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const { products } = useStock();

  useEffect(() => {
    const loadLatestProducts = () => {
      setLastUpdate(Date.now());
    };
    
    const interval = setInterval(() => {
      loadLatestProducts();
    }, 2000);

    const handleStorageChange = (e) => {
      if (e.key === 'products' || e.key === 'last_stock_update') {
        loadLatestProducts();
      }
    };
    
    const handleStockUpdated = () => {
      loadLatestProducts();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('stock-updated', handleStockUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('stock-updated', handleStockUpdated);
    };
  }, []);

  function searchProducts() {
    try {
      if (!query.trim() && selectedCategory === "all") {
        return products;
      }
      
      const lowerQuery = query.toLowerCase().trim();
      
      return products.filter(product => {
        const name = product.name || product.nome || "";
        const sku = product.sku || product.codigo || "";
        const stock = product.stock || product.estoque || 0;
        const minStock = product.min_stock || product.minEstoque || 3;
        
        const matchesSearch = !query.trim() || 
          (name.toLowerCase().includes(lowerQuery)) ||
          (sku.toLowerCase().includes(lowerQuery));
        
        let matchesCategory = true;
        if (selectedCategory !== "all") {
          switch (selectedCategory) {
            case "in_stock":
              matchesCategory = stock > 0;
              break;
            case "low_stock":
              matchesCategory = stock > 0 && stock <= minStock;
              break;
            case "out_of_stock":
              matchesCategory = stock <= 0;
              break;
          }
        }
        
        return matchesSearch && matchesCategory;
      });
    } catch (error) {
      console.error("Erro na busca:", error);
      return [];
    }
  }

  function addToCart(product) {
    try {
      if (!product || !product.id) {
        throw new Error("Produto inválido");
      }

      const stock = product.stock || product.estoque || 0;
      const name = product.name || product.nome || "";
      
      if (stock <= 0) {
        alert(`❌ ${name} está sem estoque!`);
        return;
      }

      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        if (existingItem.qty >= stock) {
          alert(`⚠️ Estoque máximo atingido para ${name}!`);
          return;
        }
        
        setCart(cart.map(item =>
          item.productId === product.id
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
            productId: product.id,
            name: product.name || product.nome || "Produto sem nome",
            qty: 1,
            unitPrice: Number(product.price || product.preco || 0),
            subtotal: Number(product.price || product.preco || 0)
          }
        ]);
      }

    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      alert("Erro ao adicionar produto ao carrinho");
    }
  }

  function changeQty(productId, newQty) {
    try {
      if (newQty < 1) {
        removeItem(productId);
        return;
      }

      const product = products.find(p => p.id === productId);
      const item = cart.find(i => i.productId === productId);

      if (!product || !item) {
        console.warn("Produto ou item não encontrado");
        return;
      }

      const stockDisponivel = product.stock || product.estoque || 0;

      if (newQty > stockDisponivel) {
        alert(`⚠️ Estoque insuficiente!\n${product.name || product.nome}: ${stockDisponivel} disponíveis`);
        return;
      }

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

  function removeItem(productId) {
    try {
      const item = cart.find(i => i.productId === productId);
      if (!item) return;

      const cartStorage = JSON.parse(localStorage.getItem('cart') || '[]');
      const newCartStorage = cartStorage.filter(i => i.id !== productId);
      localStorage.setItem('cart', JSON.stringify(newCartStorage));

      setCart(cart.filter(i => i.productId !== productId));
      
    } catch (error) {
      console.error("Erro ao remover item:", error);
      alert("Erro ao remover produto do carrinho");
    }
  }

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

      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Produto ${item.name} não encontrado`);
        }
        
        const stockDisponivel = product.stock || product.estoque || 0;
        if (stockDisponivel < item.qty) {
          throw new Error(`Estoque insuficiente para ${item.name}\nDisponível: ${stockDisponivel}, Solicitado: ${item.qty}`);
        }
      }

      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        total: total,
        paymentMethod: payment,
        date: new Date().toISOString(),
        transactionId: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      await makeSale(saleData);

      alert(`✅ Venda realizada com sucesso!\nCódigo: ${saleData.transactionId}\nTotal: R$ ${total.toFixed(2)}`);

      setCart([]);
      localStorage.removeItem('cart');

      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert(`❌ Erro ao finalizar venda: ${error.message || "Erro desconhecido"}`);
      setLoading(false);
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    
    if (window.confirm(`Limpar carrinho com ${cart.length} itens?`)) {
      localStorage.removeItem('cart');
      setCart([]);
    }
  }

  const filteredProducts = searchProducts();
  const totalVenda = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const setSelectedCategoryAndScroll = (cat) => {
    setSelectedCategory(cat);
    setTimeout(() => {
      const el = document.querySelector('.products-list');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className="sales-page-container">
      {/* 🔥 CABEÇALHO SIMPLIFICADO - REMOVIDA A SEÇÃO DE ESTOQUE */}
      <div className="sales-header-content">
        <h1>💰 Caixa de Vendas</h1>
        <div className="sync-info">
          🔄 Última sincronização: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      {/* Área principal */}
      <div className="sales-main-content">
        <div className="sales-layout">
          {/* COLUNA ESQUERDA: PRODUTOS */}
          <div className="products-column">
            <div className="card search-section">
              <h2>🛒 Selecionar Produtos</h2>
              
              <div className="search-controls">
                {/* 🔥 REMOVIDOS OS BOTÕES DE FILTRO DE ESTOQUE DO CABEÇALHO */}
                <div className="search-box">
                  <input
                    className="input search-input"
                    placeholder="Buscar produto por nome ou código..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={loading}
                  />
                  {query && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => setQuery("")}
                      title="Limpar busca"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* 🔥 FILTROS AGORA FICAM AQUI (OPCIONAL) */}
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                    type="button"
                  >
                    Todos
                  </button>
                  <button
                    className={`filter-btn ${selectedCategory === 'in_stock' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('in_stock')}
                    type="button"
                  >
                    Em Estoque
                  </button>
                  <button
                    className={`filter-btn ${selectedCategory === 'low_stock' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('low_stock')}
                    type="button"
                  >
                    Estoque Baixo
                  </button>
                  <button
                    className={`filter-btn ${selectedCategory === 'out_of_stock' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('out_of_stock')}
                    type="button"
                  >
                    Sem Estoque
                  </button>
                </div>
              </div>

              {/* LISTA DE PRODUTOS */}
              <div className="products-list">
                {loading ? (
                  <div className="loading-products">
                    <div className="spinner"></div>
                    <p>Carregando produtos...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="no-products">
                    <div className="no-products-icon">📦</div>
                    <h3>Nenhum produto encontrado</h3>
                    <p>
                      {query 
                        ? `Nenhum produto corresponde a "${query}"`
                        : selectedCategory !== "all"
                        ? `Nenhum produto com este status de estoque`
                        : "Nenhum produto cadastrado"}
                    </p>
                    <button 
                      className="button btn-secondary"
                      onClick={() => {
                        setQuery("");
                        setSelectedCategory("all");
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                ) : (
                  <div className="products-grid">
                    {filteredProducts.map(product => {
                      const stock = product.stock || product.estoque || 0;
                      const minStock = product.min_stock || product.minEstoque || 3;
                      const isLowStock = stock > 0 && stock <= minStock;
                      const isOutOfStock = stock <= 0;
                      const statusText = isOutOfStock ? 'Sem Estoque' : isLowStock ? 'Estoque Baixo' : 'Em Estoque';
                      const statusColor = isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#059669';
                      
                      const cartItem = cart.find(item => item.productId === product.id);
                      const cartQuantity = cartItem ? cartItem.qty : 0;
                      
                      return (
                        <div 
                          key={product.id} 
                          className={`product-card ${isOutOfStock ? "out-of-stock" : isLowStock ? "low-stock" : ""}`}
                        >
                          <div className="product-header">
                            <h4 className="product-name">
                              {product.name || product.nome || "Sem nome"}
                            </h4>
                            {(product.sku || product.codigo) && (
                              <span className="product-sku">{product.sku || product.codigo}</span>
                            )}
                          </div>
                          
                          <div className="product-price">
                            R$ {Number(product.price || product.preco || 0).toFixed(2)}
                          </div>
                          
                          <div className={`product-stock ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-ok"}`}>
                            <span className="stock-icon">
                              {isOutOfStock ? '❌' : isLowStock ? '⚠️' : '✅'}
                            </span>
                            <span className="stock-qty">
                              {stock}
                            </span>
                            <span className="stock-label">unidades</span>
                            {minStock > 0 && (
                              <span className="min-stock">Mín: {minStock}</span>
                            )}
                          </div>
                          
                          <div className="product-status">
                            {statusText}
                            {cartQuantity > 0 && (
                              <span className="cart-quantity">
                                ({cartQuantity} no carrinho)
                              </span>
                            )}
                          </div>
                          
                          <button
                            className={`button btn-primary add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock || loading}
                            title={isOutOfStock ? "Produto sem estoque" : "Adicionar ao carrinho"}
                          >
                            {isOutOfStock ? "Sem Estoque" : "➕ Adicionar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="products-footer">
                <span className="products-count">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </span>
                <div className="products-actions">
                  <button 
                    className="button btn-secondary btn-sm"
                    onClick={() => setLastUpdate(Date.now())}
                    disabled={loading}
                  >
                    🔄 Sincronizar
                  </button>
                  <button 
                    className="button btn-secondary btn-sm"
                    onClick={() => window.location.reload()}
                    disabled={loading}
                  >
                    ↻ Recarregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: CARRINHO */}
          <div className="cart-column">
            <div className="card cart-section">
              <div className="cart-header">
                <h2>🛍️ Carrinho de Compras</h2>
                {cart.length > 0 && (
                  <button 
                    className="button btn-danger btn-sm" 
                    onClick={clearCart}
                    disabled={loading}
                  >
                    🗑️ Limpar
                  </button>
                )}
              </div>
              
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="cart-icon">🛒</div>
                  <h3>Carrinho vazio</h3>
                  <p>Adicione produtos para começar uma venda</p>
                  <p className="cart-hint">
                    Procure produtos à esquerda e clique em "Adicionar"
                  </p>
                </div>
              ) : (
                <>
                  {/* LISTA DE ITENS NO CARRINHO */}
                  <div className="cart-items-list">
                    {cart.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      const estoqueDisponivel = product ? (product.stock || product.estoque || 0) : 0;
                      const minStock = product ? (product.min_stock || product.minEstoque || 3) : 3;
                      const isLowStock = estoqueDisponivel > 0 && estoqueDisponivel <= minStock;
                      
                      return (
                        <div key={item.productId} className="cart-item">
                          <div className="cart-item-main">
                            <div className="cart-item-info">
                              <h4 className="item-name">
                                {item.name}
                              </h4>
                              <div className="item-details">
                                <span className="item-price">
                                  R$ {item.unitPrice.toFixed(2)}/un
                                </span>
                                <span className="item-stock">
                                  Estoque: {estoqueDisponivel}
                                  {isLowStock && <span className="stock-warning"> ⚠️</span>}
                                </span>
                              </div>
                            </div>
                            
                            <div className="cart-item-controls">
                              <button
                                className="quantity-btn decrease"
                                onClick={() => changeQty(item.productId, item.qty - 1)}
                                disabled={loading}
                              >
                                −
                              </button>
                              
                              <span className="quantity-display">
                                {item.qty}
                              </span>
                              
                              <button
                                className="quantity-btn increase"
                                onClick={() => changeQty(item.productId, item.qty + 1)}
                                disabled={estoqueDisponivel <= item.qty || loading}
                                title={estoqueDisponivel <= item.qty ? "Sem estoque disponível" : "Aumentar quantidade"}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="cart-item-footer">
                            <div className="item-subtotal">
                              Subtotal: <strong>R$ {item.subtotal.toFixed(2)}</strong>
                            </div>
                            
                            <button
                              className="remove-btn"
                              onClick={() => removeItem(item.productId)}
                              title="Remover do carrinho"
                              disabled={loading}
                            >
                              🗑️ Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RESUMO DA VENDA */}
                  <div className="cart-summary">
                    <div className="summary-section">
                      <h3>Resumo da Venda</h3>
                      
                      <div className="summary-row">
                        <span>Itens no carrinho:</span>
                        <span>{cart.length}</span>
                      </div>
                      
                      <div className="summary-row">
                        <span>Total parcial:</span>
                        <span>R$ {totalVenda.toFixed(2)}</span>
                      </div>
                      
                      <div className="payment-method">
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
                    </div>
                    
                    <div className="total-section">
                      <div className="total-label">💰 Total da Venda:</div>
                      <div className="total-amount">
                        R$ {totalVenda.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="checkout-actions">
                      <button
                        className="button btn-secondary checkout-btn"
                        onClick={clearCart}
                        disabled={loading || cart.length === 0}
                      >
                        ❌ Cancelar Venda
                      </button>
                    </div>
                    
                    <div className="checkout-note">
                      <p>
                        ⚠️ O estoque será atualizado apenas após a finalização da venda.<br/>
                        ✅ Sistema anti-duplicação ativo.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTÃO FIXO NO RODAPÉ */}
      <div className="sales-fixed-footer">
        <button
          className="button btn-success checkout-btn fixed-checkout-btn"
          onClick={finalize}
          disabled={loading || cart.length === 0}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Processando...
            </>
          ) : (
            `✅ Finalizar Venda - R$ ${totalVenda.toFixed(2)}`
          )}
        </button>
      </div>

      {/* SPINNER CSS */}
      <style jsx>{`
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .product-status {
          margin-top: var(--space-sm);
          font-size: 0.9rem;
          font-weight: 600;
          color: inherit;
        }
        
        .cart-quantity {
          margin-left: 8px;
          color: var(--primary);
        }
        
        .products-actions {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

export default Sales;