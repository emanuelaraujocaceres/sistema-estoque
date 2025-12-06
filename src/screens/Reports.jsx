import { getSales, getProducts } from "../services/storage";
import "./Reports.css";

function Reports() {
  try {
    const sales = getSales() || [];
    const products = getProducts() || [];
    
    // Tratamento seguro para total
    const totalSold = Array.isArray(sales) 
      ? sales.reduce((s, sale) => s + Number(sale?.total || 0), 0)
      : 0;

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
                      <tr key={p.id || p.name}>
                        <td className="product-name">{p.name || "Sem nome"}</td>
                        <td className="stock-amount">{p.stock || 0}</td>
                        <td>
                          <span className={`stock-status ${(p.stock || 0) <= (p.min_stock || 0) ? 'status-low' : 'status-ok'}`}>
                            {(p.stock || 0) <= (p.min_stock || 0) ? '🔴 Baixo' : '🟢 Normal'}
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
                  {sales.map(s => {
                    // Tratamento seguro para venda
                    const saleId = s?.id || Date.now().toString();
                    const saleDate = s?.created_at ? new Date(s.created_at) : new Date();
                    const items = s?.items || [];
                    const total = s?.total || 0;
                    
                    return (
                      <div key={saleId} className="sale-item">
                        <div className="sale-header">
                          {/* CORREÇÃO AQUI: Verificar se id é string antes de usar substring */}
                          <div className="sale-id">
                            Venda #{typeof saleId === 'string' ? saleId.substring(0, 8) : 'VENDA'}
                          </div>
                          <div className="sale-date">
                            {saleDate.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        <div className="sale-items">
                          <div className="items-label">Itens ({items.length}):</div>
                          <div className="items-list">
                            {items.length > 0 ? (
                              items.map((it, index) => (
                                <div key={it.productId || it.id || index} className="item-row">
                                  <span className="item-name">{it.name || "Produto"}</span>
                                  <span className="item-details">
                                    {(it.qty || 0)} × R$ {(it.unitPrice || 0).toFixed(2)} = 
                                    <strong> R$ {(it.subtotal || 0).toFixed(2)}</strong>
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="small">Nenhum item encontrado</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="sale-footer">
                          <div className="sale-total">
                            <span>Total:</span>
                            <span className="total-value">R$ {Number(total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
  } catch (error) {
    console.error("Erro crítico no componente Reports:", error);
    
    // Página de erro para não quebrar o app
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>⚠️ Erro ao carregar relatórios</h2>
          <p>Ocorreu um erro ao carregar os dados. Por favor, recarregue a página.</p>
          <div className="error-details">
            <p className="small">Detalhes: {error.message}</p>
          </div>
          <button 
            className="button btn-primary"
            onClick={() => window.location.reload()}
          >
            🔄 Recarregar Página
          </button>
          <button 
            className="button btn-secondary"
            onClick={() => window.location.href = "/"}
            style={{ marginLeft: '10px' }}
          >
            🏠 Voltar para Home
          </button>
        </div>
      </div>
    );
  }
}

export default Reports;