import { getSales, getProducts } from "../services/storage";

function Reports(){
  const sales = getSales();
  const products = getProducts();
  const totalSold = sales.reduce((s, sale) => s + Number(sale.total || 0), 0);
  return (
    <div>
      <div className="card">
        <h3>Relatórios</h3>
        <div className="small">Total vendido (histórico): R$ {totalSold.toFixed(2)}</div>
        <div style={{marginTop:12}}>
          <h4>Produtos</h4>
          <table className="table">
            <thead><tr><th>Produto</th><th>Estoque</th></tr></thead>
            <tbody>
              {products.map(p=> <tr key={p.id}><td>{p.name}</td><td>{p.stock}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4>Histórico de Vendas</h4>
        {sales.length===0 && <div className="small">Sem vendas ainda.</div>}
        {sales.map(s => (
          <div key={s.id} className="card" style={{marginBottom:8}}>
            <div className="small">{new Date(s.created_at).toLocaleString()}</div>
            <div>Total: R$ {Number(s.total).toFixed(2)}</div>
            <div className="small">Itens:</div>
            <ul>
              {s.items.map(it => <li key={it.productId}>{it.name} — {it.qty} x R$ {it.unitPrice.toFixed(2)} = R$ {it.subtotal.toFixed(2)}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;
