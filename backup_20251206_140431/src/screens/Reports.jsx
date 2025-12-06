import { useState, useEffect } from "react";
import { getSales, getProducts, exportData } from "../services/storage";
import "./Reports.css";

function Reports() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [salesData, productsData] = await Promise.all([
        Promise.resolve(getSales()),
        Promise.resolve(getProducts())
      ]);

      // Validação de dados
      if (!Array.isArray(salesData)) {
        throw new Error("Dados de vendas inválidos");
      }

      if (!Array.isArray(productsData)) {
        throw new Error("Dados de produtos inválidos");
      }

      setSales(salesData);
      setProducts(productsData);
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
      setError(`Erro ao carregar dados: ${err.message}`);
      setSales([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredSales() {
    if (!Array.isArray(sales)) return [];

    let filtered = [...sales];

    // Filtrar por tipo de pagamento
    if (filter !== "all") {
      filtered = filtered.filter(sale => sale.paymentMethod === filter);
    }

    // Filtrar por data
    if (dateRange !== "all") {
      const now = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at || sale.timestamp || 0);
        return saleDate >= startDate;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.timestamp || 0);
      const dateB = new Date(b.created_at || b.timestamp || 0);
      return dateB - dateA;
    });
  }

  // Cálculos
  const filteredSales = getFilteredSales();
  const totalSold = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const totalSalesCount = filteredSales.length;
  
  // Produtos mais vendidos
  const topProducts = () => {
    const productSales = {};
    
    filteredSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item.productId) {
            const key = item.productId;
            if (!productSales[key]) {
              productSales[key] = {
                id: item.productId,
                name: item.name || "Produto desconhecido",
                totalQty: 0,
                totalRevenue: 0
              };
            }
            productSales[key].totalQty += item.qty || 0;
            productSales[key].totalRevenue += item.subtotal || 0;
          }
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  };

  // Métodos de pagamento
  const paymentMethods = () => {
    const methods = {};
    
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod || "desconhecido";
      methods[method] = (methods[method] || 0) + 1;
    });

    return Object.entries(methods).map(([method, count]) => ({
      method,
      count,
      percentage: totalSalesCount > 0 ? ((count / totalSalesCount) * 100).toFixed(1) : 0
    }));
  };

  // Produtos com estoque baixo
  const lowStockProducts = products.filter(p => 
    p.stock <= (p.min_stock || 0) || p.stock <= 3
  );

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="error-state">
          <h3>⚠️ Erro ao carregar relatórios</h3>
          <p>{error}</p>
          <button className="button btn-primary mt-2" onClick={loadData}>
            🔄 Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1>📊 Relatórios e Análises</h1>
        <p className="header-subtitle">Análise completa do desempenho do seu negócio</p>
        
        <div className="header-actions">
          <button className="button btn-secondary" onClick={loadData}>
            🔄 Atualizar Dados
          </button>
          <button className="button btn-primary" onClick={exportData}>
            📤 Exportar Relatório
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card filters-card">
        <h3>🔍 Filtros</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Forma de Pagamento:</label>
            <select 
              className="filter-select" 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">Todas as formas</option>
              <option value="dinheiro">💵 Dinheiro</option>
              <option value="pix">🏦 PIX</option>
              <option value="cartao_credito">💳 Cartão de Crédito</option>
              <option value="cartao_debito">💳 Cartão de Débito</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Período:</label>
            <select 
              className="filter-select" 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="all">Todo o período</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="year">Último ano</option>
            </select>
          </div>

          <div className="filter-stats">
            <div className="stat-item">
              <span className="stat-label">Vendas filtradas:</span>
              <span className="stat-value">{filteredSales.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="summary-cards">
        <div className="summary-card total-sales">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Total Vendido</h3>
            <div className="summary-value">R$ {totalSold.toFixed(2)}</div>
            <div className="summary-subtitle">{totalSalesCount} vendas</div>
          </div>
        </div>

        <div className="summary-card total-products">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h3>Produtos Cadastrados</h3>
            <div className="summary-value">{products.length}</div>
            <div className="summary-subtitle">{lowStockProducts.length} com estoque baixo</div>
          </div>
        </div>

        <div className="summary-card avg-sale">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h3>Ticket Médio</h3>
            <div className="summary-value">
              R$ {totalSalesCount > 0 ? (totalSold / totalSalesCount).toFixed(2) : "0.00"}
            </div>
            <div className="summary-subtitle">por venda</div>
          </div>
        </div>
      </div>

      {/* Grid de Relatórios */}
      <div className="reports-grid">
        {/* Produtos Mais Vendidos */}
        <div className="report-card">
          <div className="report-card-header">
            <h2>🔥 Produtos Mais Vendidos</h2>
            <span className="badge badge-primary">TOP 5</span>
          </div>
          
          {topProducts().length > 0 ? (
            <div className="top-products-list">
              {topProducts().map((product, index) => (
                <div key={product.id} className="top-product-item">
                  <div className="product-rank">
                    <span className={`rank-badge rank-${index + 1}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-stats">
                      <span className="stat-qty">{product.totalQty} unidades</span>
                      <span className="stat-revenue">R$ {product.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>Nenhuma venda no período selecionado</p>
            </div>
          )}
        </div>

        {/* Métodos de Pagamento */}
        <div className="report-card">
          <div className="report-card-header">
            <h2>💳 Métodos de Pagamento</h2>
            <span className="badge badge-info">{paymentMethods().length}</span>
          </div>
          
          {paymentMethods().length > 0 ? (
            <div className="payment-methods">
              {paymentMethods().map(method => (
                <div key={method.method} className="payment-method-item">
                  <div className="method-name">
                    {method.method === 'dinheiro' && '💵 Dinheiro'}
                    {method.method === 'pix' && '🏦 PIX'}
                    {method.method === 'cartao_credito' && '💳 Cartão de Crédito'}
                    {method.method === 'cartao_debito' && '💳 Cartão de Débito'}
                    {method.method === 'desconhecido' && '❓ Desconhecido'}
                  </div>
                  <div className="method-stats">
                    <div className="method-count">{method.count} vendas</div>
                    <div className="method-percentage">{method.percentage}%</div>
                  </div>
                  <div className="method-bar">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${method.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <p>Nenhum dado de pagamento</p>
            </div>
          )}
        </div>

        {/* Histórico de Vendas */}
        <div className="report-card full-width">
          <div className="report-card-header">
            <h2>📋 Histórico de Vendas</h2>
            <span className="badge">{filteredSales.length} vendas</span>
          </div>
          
          {filteredSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <p>Nenhuma venda registrada</p>
              <p className="empty-subtitle">As vendas aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div className="sales-history">
              <div className="table-responsive">
                <table className="table sales-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data/Hora</th>
                      <th>Itens</th>
                      <th>Total</th>
                      <th>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map(sale => {
                      const saleDate = new Date(sale.created_at || sale.timestamp || Date.now());
                      const itemsCount = sale.items?.length || 0;
                      
                      return (
                        <tr key={sale.id}>
                          <td className="sale-id">
                            <span className="id-text">{sale.id.substring(0, 8)}...</span>
                          </td>
                          <td className="sale-date">
                            {saleDate.toLocaleDateString('pt-BR')}
                            <div className="sale-time">
                              {saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="sale-items">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                            <div className="items-preview">
                              {sale.items?.slice(0, 2).map(item => (
                                <span key={item.productId} className="item-tag">
                                  {item.name || 'Produto'}
                                </span>
                              ))}
                              {itemsCount > 2 && (
                                <span className="item-tag more">+{itemsCount - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="sale-total">
                            <strong>R$ {Number(sale.total || 0).toFixed(2)}</strong>
                          </td>
                          <td className="sale-payment">
                            <span className={`payment-badge payment-${sale.paymentMethod}`}>
                              {sale.paymentMethod === 'dinheiro' && '💵'}
                              {sale.paymentMethod === 'pix' && '🏦'}
                              {sale.paymentMethod === 'cartao_credito' && '💳'}
                              {sale.paymentMethod === 'cartao_debito' && '💳'}
                              {sale.paymentMethod || '❓'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="sales-footer">
                <div className="pagination-info">
                  Mostrando {Math.min(filteredSales.length, 10)} de {filteredSales.length} vendas
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estoque Baixo */}
        {lowStockProducts.length > 0 && (
          <div className="report-card">
            <div className="report-card-header">
              <h2>⚠️ Estoque Baixo</h2>
              <span className="badge badge-warning">{lowStockProducts.length}</span>
            </div>
            
            <div className="low-stock-list">
              {lowStockProducts.slice(0, 5).map(product => (
                <div key={product.id} className="low-stock-item">
                  <div className="product-name">{product.name}</div>
                  <div className="stock-info">
                    <span className="current-stock">{product.stock} unidades</span>
                    <span className="min-stock">Mín: {product.min_stock || 0}</span>
                  </div>
                  <div className={`stock-status ${product.stock <= 0 ? 'out' : 'low'}`}>
                    {product.stock <= 0 ? 'ESGOTADO' : 'BAIXO'}
                  </div>
                </div>
              ))}
            </div>
            
            {lowStockProducts.length > 5 && (
              <div className="card-footer">
                <button className="button btn-warning btn-sm">
                  Ver todos ({lowStockProducts.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="card stats-card">
        <h2>📈 Estatísticas Detalhadas</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-title">Total de Vendas</div>
              <div className="stat-value">{totalSalesCount}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-title">Total de Produtos</div>
              <div className="stat-value">{products.length}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-title">Ticket Médio</div>
              <div className="stat-value">
                R$ {totalSalesCount > 0 ? (totalSold / totalSalesCount).toFixed(2) : "0.00"}
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-title">Período</div>
              <div className="stat-value">
                {dateRange === 'all' ? 'Todo período' : 
                 dateRange === 'today' ? 'Hoje' :
                 dateRange === 'week' ? '7 dias' :
                 dateRange === 'month' ? '30 dias' : '365 dias'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;