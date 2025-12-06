import { useEffect, useState } from "react";
import { getProducts, makeSale } from "../services/storage";

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
    const existing = cart.find(c => c.productId === prod.id);
    if (existing) {
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
        subtotal: Number(prod.price) 
      }]);
    }
  }

  function changeQty(productId, qty){
    if (qty < 1) return;
    setCart(c => c.map(x => 
      x.productId === productId 
        ? {...x, qty, subtotal: qty * x.unitPrice} 
        : x
    ));
  }

  function removeItem(productId){
    setCart(c => c.filter(x => x.productId !== productId));
  }

  function finalize(){
    if (cart.length === 0) return alert("Carrinho vazio");
    const total = cart.reduce((s, i) => s + i.subtotal, 0);
    
    // CORREÇÃO AQUI ↓
    const saleData = {
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      })),
      total: total,
      paymentMethod: payment,
      date: new Date().toISOString()
    };
    
    try {
      makeSale(saleData); // Passa apenas 1 objeto
      alert("Venda realizada. Total R$ " + total.toFixed(2));
      setCart([]);
      setProducts(getProducts());
    } catch (err) {
      alert("Erro: " + err.message);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Vender</h3>
        <div className="row">
          <input 
            className="input col" 
            placeholder="Buscar produto por nome ou SKU" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
          <button className="button" onClick={() => setQuery("")}>Limpar</button>
        </div>

        <div style={{marginTop: 12}}>
          <div className="small">Resultados:</div>
          <div style={{
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", 
            gap: 8, 
            marginTop: 8
          }}>
            {search(query).map(p => (
              <div key={p.id} className="card" style={{padding: 10}}>
                <div><strong>{p.name}</strong></div>
                <div className="small">
                  R$ {Number(p.price).toFixed(2)} • Estoque: {p.stock}
                </div>
                <div style={{marginTop: 8}}>
                  <button 
                    className="button btn-primary" 
                    onClick={() => addToCart(p)}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
            {search(query).length === 0 && <div className="small">Nenhum produto</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Carrinho</h3>
        {cart.length === 0 && <div className="small">Carrinho vazio</div>}
        {cart.map(i => (
          <div 
            key={i.productId} 
            style={{
              display: "flex", 
              gap: 8, 
              alignItems: "center", 
              marginBottom: 8
            }}
          >
            <div style={{flex: 1}}>
              <strong>{i.name}</strong>
              <div className="small">R$ {i.unitPrice.toFixed(2)}</div>
            </div>
            <div style={{width: 110}}>
              <input 
                className="input" 
                type="number" 
                value={i.qty} 
                min={1} 
                onChange={e => changeQty(i.productId, Number(e.target.value))} 
              />
            </div>
            <div style={{width: 110}}>R$ {i.subtotal.toFixed(2)}</div>
            <div>
              <button 
                className="button" 
                onClick={() => removeItem(i.productId)}
              >
                Remover
              </button>
            </div>
          </div>
        ))}

        <div style={{
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginTop: 10
        }}>
          <div>
            <label className="small">Pagamento: </label>
            <select value={payment} onChange={e => setPayment(e.target.value)}>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>
          <div>
            <strong>Total: R$ {cart.reduce((s,i) => s + i.subtotal, 0).toFixed(2)}</strong>
            <button 
              className="button btn-primary" 
              style={{marginLeft: 10}} 
              onClick={finalize}
            >
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;