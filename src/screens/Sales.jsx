import { useEffect, useState } from "react";
import { makeSale } from "../services/storage";
import { useStock } from '../hooks/useStock';
import "./Sales.css";

function Sales() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [weightInputs, setWeightInputs] = useState({});
  const [payment, setPayment] = useState("dinheiro");
  const [amountReceived, setAmountReceived] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [cashWithdrawal, setCashWithdrawal] = useState(0); // Novo estado para retirada de dinheiro
  
  const { products } = useStock();

  const formatStock = (product) => {
    if (!product) return '';
    const stock = Number(product.stock || 0);
    if (product.saleType === 'weight') {
      if (stock >= 1000) return `${(stock/1000).toFixed(3).replace(/\.?0+$/,'')} kg (${stock} g)`;
      return `${stock} g`;
    }
    return `${stock} unidades`;
  };

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
    // New behavior: accept a weight value provided in weightInputs state for weight products
    try {
      if (!product || !product.id) throw new Error("Produto inválido");

      const stock = product.stock || product.estoque || 0;
      const name = product.name || product.nome || "";
      const saleType = product.saleType || "unit";

      if (saleType === "unit") {
        if (stock <= 0) {
          alert(`❌ ${name} está sem estoque!`);
          return;
        }

        const existingItem = cart.find(item => item.productId === product.id && !item.weight);
        if (existingItem) {
          if (existingItem.qty >= stock) {
            alert(`⚠️ Estoque máximo atingido para ${name}!`);
            return;
          }
          setCart(cart.map(item =>
            item.productId === product.id && !item.weight
              ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.unitPrice }
              : item
          ));
        } else {
          setCart([ ...cart, {
            productId: product.id,
            name: product.name || product.nome || "Produto sem nome",
            qty: 1,
            unitPrice: Number(product.price || product.preco || 0),
            subtotal: Number(product.price || product.preco || 0),
            saleType: "unit"
          }]);
        }
        return;
      }

      // saleType === 'weight'
      const rawWeight = weightInputs[product.id];
      if (!rawWeight) {
        alert('⚠️ Informe o peso em gramas no campo ao lado do produto antes de adicionar');
        return;
      }

      // parse weight: accept '250', '250g', '1.5kg', '1,5kg'
      const parseGrams = (val) => {
        if (val == null) return null;
        const s = String(val).trim().toLowerCase().replace(',', '.');
        if (!s) return null;
        if (s.endsWith('kg')) {
          const num = parseFloat(s.replace('kg','').trim());
          return Number.isNaN(num) ? null : Math.round(num * 1000);
        }
        if (s.endsWith('g')) {
          const num = parseFloat(s.replace('g','').trim());
          return Number.isNaN(num) ? null : Math.round(num);
        }
        if (s.includes('.')) {
          const num = parseFloat(s);
          return Number.isNaN(num) ? null : Math.round(num * 1000);
        }
        const num = parseInt(s.replace(/[^0-9]/g,''), 10);
        return Number.isNaN(num) ? null : num;
      };

      const weightInGrams = parseGrams(rawWeight);
      if (!weightInGrams || weightInGrams <= 0) {
        alert('❌ Digite um peso válido em gramas (ex: 250, 500 ou 1.5kg)');
        return;
      }

      const pricePerKilo = Number(product.pricePerKilo || 0);
      if (!pricePerKilo || pricePerKilo <= 0) {
        alert(`❌ Produto "${name}" não possui preço por quilo definido.`);
        return;
      }
      const unitPrice = (weightInGrams / 1000) * pricePerKilo;

      const existingItem = cart.find(item => item.productId === product.id && item.weight === weightInGrams);
      if (existingItem) {
        setCart(cart.map(item => item.productId === product.id && item.weight === weightInGrams
          ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * unitPrice }
          : item
        ));
      } else {
        setCart([ ...cart, {
          productId: product.id,
          name: product.name || product.nome || 'Produto sem nome',
          qty: 1,
          unitPrice: unitPrice,
          subtotal: unitPrice,
          weight: weightInGrams,
          saleType: 'weight',
          pricePerKilo: pricePerKilo
        }]);
      }

    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      alert('Erro ao adicionar produto ao carrinho');
    }
  }

  function changeQty(productId, newQty, weight = null) {
    try {
      if (newQty < 1) {
        removeItem(productId, weight);
        return;
      }

      const product = products.find(p => p.id === productId);
      const item = cart.find(i => i.productId === productId && (weight === null ? !i.weight : i.weight === weight));

      if (!product || !item) {
        console.warn("Produto ou item não encontrado");
        return;
      }

      // Se for produto por peso, não validar estoque
      if (item.saleType === "weight") {
        setCart(cart.map(cartItem =>
          cartItem.productId === productId && cartItem.weight === weight
            ? {
                ...cartItem,
                qty: newQty,
                subtotal: newQty * cartItem.unitPrice
              }
            : cartItem
        ));
        return;
      }

      // Para produtos por unidade
      const stockDisponivel = product.stock || product.estoque || 0;

      if (newQty > stockDisponivel) {
        alert(`⚠️ Estoque insuficiente!\n${product.name || product.nome}: ${stockDisponivel} disponíveis`);
        return;
      }

      setCart(cart.map(cartItem =>
        cartItem.productId === productId && !cartItem.weight
          ? {
              ...cartItem,
              qty: newQty,
              subtotal: newQty * cartItem.unitPrice
            }
          : cartItem
      ));

    } catch (error) {
      console.error("Erro ao alterar quantidade:", error);
    }
  }

  function removeItem(productId, weight = null) {
    try {
      const item = cart.find(i => i.productId === productId && (weight === null ? !i.weight : i.weight === weight));
      if (!item) return;

      setCart(cart.filter(i => !(i.productId === productId && (weight === null ? !i.weight : i.weight === weight))));
      
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
        // Validação de estoque: se for produto por peso, `stock` é em gramas
        if (product.saleType === 'weight') {
          const totalGramsNeeded = (Number(item.weight || 0) * Number(item.qty || 0));
          const stockGrams = Number(product.stock || 0);
          if (stockGrams < totalGramsNeeded) {
            throw new Error(`Estoque insuficiente para ${item.name}\nDisponível: ${stockGrams}g, Solicitado: ${totalGramsNeeded}g`);
          }
        } else {
          const stockDisponivel = product.stock || product.estoque || 0;
          if (stockDisponivel < item.qty) {
            throw new Error(`Estoque insuficiente para ${item.name}\nDisponível: ${stockDisponivel}, Solicitado: ${item.qty}`);
          }
        }
      }

      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          weight: item.weight, // em gramas para produtos por peso
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
      // Não forçar reload; eventos de storage já atualizam o restante da UI
      setLoading(false);

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

  // removed unused helper setSelectedCategoryAndScroll

  const handleCashWithdrawalChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setCashWithdrawal(value);
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
                            {product.saleType === 'weight' ? (
                              <>R$ {Number(product.pricePerKilo || product.price || 0).toFixed(2)} /kg</>
                            ) : (
                              <>R$ {Number(product.price || product.preco || 0).toFixed(2)}</>
                            )}
                          </div>
                          
                          <div className={`product-stock ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-ok"}`}>
                            <span className="stock-icon">
                              {isOutOfStock ? '❌' : isLowStock ? '⚠️' : '✅'}
                            </span>
                            <span className="stock-qty">
                              {formatStock(product)}
                            </span>
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
                          
                          <div className="product-actions">
                            {product.saleType === 'weight' ? (
                              <div className="weight-add">
                                <input
                                  className="input weight-input"
                                  placeholder="g (ex:250) ou 1.5kg"
                                  value={weightInputs[product.id] || ''}
                                  onChange={e => setWeightInputs(prev => ({ ...prev, [product.id]: e.target.value }))}
                                  disabled={loading}
                                />
                                <button
                                  className={`button btn-primary add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
                                  onClick={() => addToCart(product)}
                                  disabled={isOutOfStock || loading}
                                  title={isOutOfStock ? "Produto sem estoque" : "Adicionar ao carrinho"}
                                >
                                  {isOutOfStock ? "Sem Estoque" : "➕ Adicionar"}
                                </button>
                              </div>
                            ) : (
                              <button
                                className={`button btn-primary add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
                                onClick={() => addToCart(product)}
                                disabled={isOutOfStock || loading}
                                title={isOutOfStock ? "Produto sem estoque" : "Adicionar ao carrinho"}
                              >
                                {isOutOfStock ? "Sem Estoque" : "➕ Adicionar"}
                              </button>
                            )}
                          </div>
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
                                  {item.saleType === 'weight' ?
                                    `R$ ${item.unitPrice.toFixed(2)} (${item.weight} g)` :
                                    `R$ ${item.unitPrice.toFixed(2)}/un`
                                  }
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
                                onClick={() => changeQty(item.productId, item.qty - 1, item.weight)}
                                disabled={loading}
                              >
                                −
                              </button>
                              
                              <span className="quantity-display">
                                {item.qty}
                              </span>
                              
                              <button
                                className="quantity-btn increase"
                                onClick={() => changeQty(item.productId, item.qty + 1, item.weight)}
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
                              onClick={() => removeItem(item.productId, item.weight)}
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
                          onChange={e => {
                            setPayment(e.target.value);
                            setAmountReceived(""); // Reset troco quando mudar forma de pagamento
                          }}
                          disabled={loading}
                        >
                          <option value="dinheiro">💵 Dinheiro</option>
                          <option value="pix">🏦 PIX</option>
                          <option value="cartao_credito">💳 Cartão de Crédito</option>
                          <option value="cartao_debito">💳 Cartão de Débito</option>
                        </select>
                      </div>

                      {payment === "dinheiro" && (
                        <div className="payment-method">
                          <label>💰 Valor Recebido (para calcular troco):</label>
                          <input
                            type="number"
                            className="payment-select"
                            placeholder="Ex: 100.00"
                            value={amountReceived}
                            onChange={e => setAmountReceived(e.target.value)}
                            disabled={loading || cart.length === 0}
                            step="0.01"
                            min="0"
                          />
                          {amountReceived && parseFloat(amountReceived) >= 0 && (
                            <div className="change-display">
                              <span className="change-label">Troco:</span>
                              <span className={`change-amount ${parseFloat(amountReceived) < totalVenda ? 'insufficient' : ''}`}>
                                R$ {Math.max(0, parseFloat(amountReceived) - totalVenda).toFixed(2)}
                              </span>
                              {parseFloat(amountReceived) < totalVenda && (
                                <span className="change-warning">⚠️ Valor insuficiente</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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