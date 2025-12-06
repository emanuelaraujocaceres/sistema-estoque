import { useEffect, useState } from "react";
import { getProducts, makeSale, updateProduct } from "../services/storage"; // Adicionar updateProduct
import "./Sales.css";

function Sales(){
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("dinheiro");

  useEffect(() => setProducts(getProducts()), []);

  function search(q){
    return products.filter(p => 
      p.name.toLowerCase().includes(q.toLowerCase()) || 
      (p.sku && p.sku.includes(q))
    );
  }

  function addToCart(prod){
    // Verificar se tem estoque suficiente
    if (prod.stock <= 0) {
      alert(`${prod.name} está sem estoque!`);
      return;
    }
    
    const existing = cart.find(c => c.productId === prod.id);
    if (existing) {
      // Verificar se não ultrapassa o estoque
      const totalInCart = existing.qty + 1;
      if (totalInCart > prod.stock) {
        alert(`Estoque insuficiente! Restam apenas ${prod.stock} unidades de ${prod.name}`);
        return;
      }
      
      setCart(c => c.map(x => 
        x.productId === prod.id 
          ? {...x, qty: x.qty + 1, subtotal: (x.qty + 1) * x.unitPrice} 
          : x
      ));
    } else {
      setCart(c => [...c, { 
        productId: prod.id, 
        name: prod.name, 
        qty: 1, 
        unitPrice: Number(prod.price), 
        subtotal: Number(prod.price),
        currentStock: prod.stock // Salvar estoque atual para validação
      }]);
    }
  }

  function changeQty(productId, newQty){
    if (newQty < 1) {
      removeItem(productId);
      return;
    }
    
    // Encontrar o item no carrinho e o produto original
    const item = cart.find(x => x.productId === productId);
    const product = products.find(p => p.id === productId);
    
    if (!item || !product) return;
    
    // Verificar se não ultrapassa o estoque
    if (newQty > product.stock) {
      alert(`Estoque insuficiente! Restam apenas ${product.stock} unidades de ${product.name}`);
      return;
    }
    
    setCart(c => c.map(x => 
      x.productId === productId 
        ? {...x, qty: newQty, subtotal: newQty * x.unitPrice} 
        : x
    ));
  }

  function removeItem(productId){
    setCart(c => c.filter(x => x.productId !== productId));
  }

  async function finalize(){
    if (cart.length === 0) {
      alert("Carrinho vazio");
      return;
    }
    
    // Verificar estoque de todos os itens antes de finalizar
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        alert(`Produto ${item.name} não encontrado!`);
        return;
      }
      if (product.stock < item.qty) {
        alert(`Estoque insuficiente para ${item.name}! Restam apenas ${product.stock} unidades`);
        return;
      }
    }
    
    const total = cart.reduce((s, i) => s + i.subtotal, 0);
    
    const saleData = {
      id: Date.now().toString(), // Garantir que tenha ID como string
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty, // Mantendo como 'qty' para compatibilidade com Reports.jsx
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      })),
      total: total,
      paymentMethod: payment,
      created_at: new Date().toISOString() // Usando created_at para compatibilidade
    };
    
    try {
      // 1. Salvar a venda
      makeSale(saleData);
      
      // 2. Atualizar estoque de cada produto vendido
      cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const novoEstoque = product.stock - item.qty;
          
          // Atualizar produto no localStorage
          updateProduct(product.id, {
            ...product,
            stock: Math.max(0, novoEstoque) // Não deixar negativo
          });
        }
      });
      
      // 3. Feedback e limpeza
      alert(`✅ Venda realizada com sucesso!\nTotal: R$ ${total.toFixed(2)}`);
      setCart([]);
      
      // 4. Atualizar lista de produtos (com estoque atualizado)
      setProducts(getProducts());
      
    } catch (err) {
      alert("❌ Erro ao finalizar venda: " + (err.message || "Erro desconhecido"));
      console.error("Erro na venda:", err);
    }
  }

  return (
    <div className="sales-container">
      <div className="card">
        <h3>🛒 Vender</h3>
        <div className="search-section">
          <div className="search-header">
            <input 
              className="input search-input" 
              placeholder="Buscar produto por nome ou SKU" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
            />
            <button className="button btn-secondary" onClick={() => setQuery("")}>
              🔄 Limpar
            </button>
          </div>

          <div className="products-grid">
            {search(query).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-info">
                  <h4>{p.name}</h4>
                  <div className="product-price">R$ {Number(p.price).toFixed(2)}</div>
                  <div className={`product-stock ${p.stock <= 0 ? 'stock-out' : p.stock <= (p.min_stock || 5) ? 'stock-low' : 'stock-ok'}`}>
                    📦 Estoque: {p.stock} {p.unit || 'un'}
                  </div>
                </div>
                <button 
                  className="button btn-primary" 
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                >
                  {p.stock <= 0 ? 'Sem Estoque' : '➕ Adicionar'}
                </button>
              </div>
            ))}
            {search(query).length === 0 && (
              <div className="empty-search">
                🔍 Nenhum produto encontrado
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card cart-section">
        <h3>🛍️ Carrinho ({cart.length} itens)</h3>
        
        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="cart-icon">🛒</div>
            <p>Carrinho vazio</p>
            <p className="cart-subtitle">Adicione produtos para começar uma venda</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(i => {
                const product = products.find(p => p.id === i.productId);
                const estoqueDisponivel = product?.stock || 0;
                
                return (
                  <div key={i.productId} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{i.name}</div>
                      <div className="cart-item-price">
                        R$ {i.unitPrice.toFixed(2)}/un • Disponível: {estoqueDisponivel}
                      </div>
                    </div>
                    
                    <div className="cart-item-controls">
                      <button 
                        className="quantity-btn decrease"
                        onClick={() => changeQty(i.productId, i.qty - 1)}
                      >
                        −
                      </button>
                      
                      <input 
                        className="quantity-input" 
                        type="number" 
                        value={i.qty} 
                        min={1} 
                        max={estoqueDisponivel}
                        onChange={e => changeQty(i.productId, Number(e.target.value))} 
                      />
                      
                      <button 
                        className="quantity-btn increase"
                        onClick={() => changeQty(i.productId, i.qty + 1)}
                        disabled={i.qty >= estoqueDisponivel}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="cart-item-subtotal">
                      R$ {i.subtotal.toFixed(2)}
                    </div>
                    
                    <button 
                      className="remove-btn" 
                      onClick={() => removeItem(i.productId)}
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
                  <option value="transferencia">📤 Transferência</option>
                </select>
              </div>
              
              <div className="total-section">
                <div className="total-label">💰 Total da Venda:</div>
                <div className="total-amount">
                  R$ {cart.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}
                </div>
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