import { getSales, getProducts } from "../services/storage";
import "./Reports.css";

function Reports() {
  const sales = getSales();
  const products = getProducts();
  const totalSold = sales.reduce((s, sale) => s + Number(sale.total || 0), 0);

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1>📊 Relatórios</h1>
        <p className="header-subtitle">Analise o desempenho do seu negócio</p>
      </div>

      {/* Total de Vendas */}
      <div className="total-sales-card">
        <h2>💰 Total Vendido (Histórico)</h2>
        <div className="total-amount">R$ {totalSold.toFixed(2)}</div>
        <p className="total-description">Valor acumulado de todas as vendas realizadas</p>
      </div>

      {/* Grid de Relatórios */}
      <div className="reports-grid">
        {/* Card de Produtos */}
        <div className="report-card">
          <div className="report-card-header">
            <h2>📦 Produtos em Estoque</h2>
            <span className="badge">{products.length} produtos</span>
          </div>
          
          {products.length > 0 ? (
            <div className="table-responsive">
              <table className="table products-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Estoque</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="product-name">{p.name}</td>
                      <td className="stock-amount">{p.stock}</td>
                      <td>
                        <span className={`stock-status ${p.stock <= (p.min_stock || 0) ? 'status-low' : 'status-ok'}`}>
                          {p.stock <= (p.min_stock || 0) ? '🔴 Baixo' : '🟢 Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>Nenhum produto cadastrado</p>
            </div>
          )}
        </div>

        {/* Card de Histórico de Vendas */}
        <div className="report-card">
          <div className="report-card-header">
            <h2>💰 Histórico de Vendas</h2>
            <span className="badge">{sales.length} vendas</span>
          </div>
          
          <div className="sales-history">
            {sales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛒</div>
                <p>Sem vendas registradas ainda</p>
                <p className="empty-subtitle">As vendas aparecerão aqui automaticamente</p>
              </div>
            ) : (
              <div className="sales-list">
                {sales.map(s => (
                  <div key={s.id} className="sale-item">
                    <div className="sale-header">
                      <div className="sale-id">Venda #{s.id.substring(0, 8)}...</div>
                      <div className="sale-date">
                        {new Date(s.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    <div className="sale-items">
                      <div className="items-label">Itens ({s.items.length}):</div>
                      <div className="items-list">
                        {s.items.map(it => (
                          <div key={it.productId} className="item-row">
                            <span className="item-name">{it.name}</span>
                            <span className="item-details">
                              {it.qty} × R$ {it.unitPrice.toFixed(2)} = 
                              <strong> R$ {it.subtotal.toFixed(2)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="sale-footer">
                      <div className="sale-total">
                        <span>Total:</span>
                        <span className="total-value">R$ {Number(s.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card de Análise (Placeholder) */}
      <div className="report-card">
        <h2>📈 Análise de Desempenho</h2>
        <div className="chart-placeholder">
          <div className="chart-icon">📊</div>
          <p>Gráficos de desempenho estarão disponíveis em breve</p>
          <p className="chart-subtitle">Acompanhe vendas, estoque e lucros de forma visual</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;