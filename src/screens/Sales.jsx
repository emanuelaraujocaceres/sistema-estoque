import { useEffect, useState } from "react";
import { getProducts, makeSale, getProductById } from "../services/storage";
import "./Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("dinheiro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Carregar produtos
  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  // Buscar produtos
  function searchProducts() {
    try {
      if (!query.trim() && selectedCategory === "all") {
        return products; // Retorna todos os produtos quando não há filtro
      }
      
      const lowerQuery = query.toLowerCase().trim();
      
      return products.filter(product => {
        // Filtro por busca
        const matchesSearch = !query.trim() || 
          (product.name && product.name.toLowerCase().includes(lowerQuery)) ||
          (product.sku && product.sku.toLowerCase().includes(lowerQuery));
        
        // Filtro por categoria (status de estoque)
        let matchesCategory = true;
        if (selectedCategory !== "all") {
          switch (selectedCategory) {
            case "in_stock":
              matchesCategory = product.stock > 0;
              break;
            case "low_stock":
              matchesCategory = product.stock > 0 && product.stock <= (product.min_stock || 3);
              break;
            case "out_of_stock":
              matchesCategory = product.stock <= 0;
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

  // ✅ ADICIONAR AO CARRINHO
  function addToCart(product) {
    try {
      if (!product || !product.id) {
        throw new Error("Produto inválido");
      }

      // Verificar estoque
      if (product.stock <= 0) {
        alert(`❌ ${product.name} está sem estoque!`);
        return;
      }

      const existingItem = cart.find(item => item.productId === product.id);
      const quantidadeDesejada = existingItem ? existingItem.qty + 1 : 1;

      // Verificar se tem estoque suficiente
      if (quantidadeDesejada > product.stock) {
        alert(`⚠️ Estoque insuficiente!\n${product.name}: ${product.stock} disponíveis`);
        return;
      }

      // Atualizar carrinho
      if (existingItem) {
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
            name: product.name || "Produto sem nome",
            qty: 1,
            unitPrice: Number(product.price) || 0,
            subtotal: Number(product.price) || 0
          }
        ]);
      }

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

  // Limpar carrinho
  function clearCart() {
    if (cart.length === 0) return;
    
    if (window.confirm(`Limpar carrinho com ${cart.length} itens?`)) {
      setCart([]);
    }
  }

  // Calcular total
  const totalVenda = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  
  // Estatísticas
  const filteredProducts = searchProducts();
  const productsInStock = products.filter(p => p.stock > 0).length;
  const productsLowStock = products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 3)).length;
  const productsOutOfStock = products.filter(p => p.stock <= 0).length;

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

      {/* Cabeçalho com estatísticas */}
      <div className="sales-header">
        <h1>💰 Caixa de Vendas</h1>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Produtos em estoque:</span>
            <span className="stat-value">{productsInStock}</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-label">Estoque baixo:</span>
            <span className="stat-value">{productsLowStock}</span>
          </div>
          <div className="stat-item danger">
            <span className="stat-label">Sem estoque:</span>
            <span className="stat-value">{productsOutOfStock}</span>
          </div>
        </div>
      </div>

      <div className="sales-layout">
        {/* COLUNA ESQUERDA: PRODUTOS */}
        <div className="products-column">
          <div className="card search-section">
            <h2>🛒 Selecionar Produtos</h2>
            
            <div className="search-controls">
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
              
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${selectedCategory === "all" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("all")}
                >
                  Todos
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === "in_stock" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("in_stock")}
                >
                  Em Estoque
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === "low_stock" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("low_stock")}
                >
                  Estoque Baixo
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === "out_of_stock" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("out_of_stock")}
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
                    const isLowStock = product.stock > 0 && product.stock <= (product.min_stock || 3);
                    const isOutOfStock = product.stock <= 0;
                    
                    return (
                      <div 
                        key={product.id} 
                        className={`product-card ${isOutOfStock ? "out-of-stock" : isLowStock ? "low-stock" : ""}`}
                      >
                        <div className="product-header">
                          <h4 className="product-name">{product.name}</h4>
                          {product.sku && (
                            <span className="product-sku">{product.sku}</span>
                          )}
                        </div>
                        
                        <div className="product-price">
                          R$ {Number(product.price || 0).toFixed(2)}
                        </div>
                        
                        <div className={`product-stock ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-ok"}`}>
                          <span className="stock-icon">📦</span>
                          <span className="stock-qty">{product.stock || 0}</span>
                          <span className="stock-label">unidades</span>
                          {product.min_stock > 0 && (
                            <span className="min-stock">Mín: {product.min_stock}</span>
                          )}
                        </div>
                        
                        <button
                          className="button btn-primary add-to-cart-btn"
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
              <button 
                className="button btn-secondary btn-sm"
                onClick={loadProducts}
                disabled={loading}
              >
                🔄 Atualizar
              </button>
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
                  🗑️ Limpar Carrinho
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
                    const product = getProductById(item.productId);
                    const estoqueDisponivel = product?.stock || 0;
                    const isLowStock = product?.stock > 0 && product?.stock <= (product?.min_stock || 3);
                    
                    return (
                      <div key={item.productId} className="cart-item">
                        <div className="cart-item-main">
                          <div className="cart-item-info">
                            <h4 className="item-name">{item.name}</h4>
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
                            
                            <span className="quantity-display">{item.qty}</span>
                            
                            <button
                              className="quantity-btn increase"
                              onClick={() => changeQty(item.productId, item.qty + 1)}
                              disabled={estoqueDisponivel <= 0 || loading}
                              title={estoqueDisponivel <= 0 ? "Sem estoque disponível" : "Aumentar quantidade"}
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
                  
                  <div className="checkout-note">
                    <p>⚠️ Após finalizar, a venda será registrada e o estoque será atualizado automaticamente.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;