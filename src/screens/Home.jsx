import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { getProducts, getSales, initDefaultProducts, clearAllData } from "../services/storage";
import "./Home.css";

export default function Home() {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [loadingName, setLoadingName] = useState(false);
  
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // Carregar estatísticas
  const products = getProducts();
  const sales = getSales();
  
  const totalProducts = products.length;
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 0) || p.stock <= 3).length;
  
  // Funções de logout
  async function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair da sua conta?")) {
      try {
        await supabase.auth.signOut();
        navigate("/login");
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
      }
    }
  }

  // Funções de atualização de perfil
  async function saveName(e) {
    e?.preventDefault();
    if (!name.trim()) {
      alert("Por favor, informe um nome válido.");
      return;
    }
    
    setLoadingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        data: { name: name.trim() } 
      });
      
      if (error) throw error;
      
      alert("✅ Nome atualizado com sucesso!");
      setEditingName(false);
    } catch (err) {
      console.error("Erro ao atualizar nome:", err);
      alert(`❌ Erro ao atualizar nome: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingName(false);
    }
  }

  async function saveEmail(e) {
    e?.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      alert("Por favor, informe um e-mail válido.");
      return;
    }
    
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      
      if (error) throw error;
      
      alert("✅ E-mail atualizado!\nVerifique sua caixa de entrada para confirmar o novo e-mail.");
      setEditingEmail(false);
    } catch (err) {
      console.error("Erro ao atualizar e-mail:", err);
      alert(`❌ Erro ao atualizar e-mail: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingEmail(false);
    }
  }

  async function savePassword(e) {
    e?.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) throw error;
      
      alert("✅ Senha alterada com sucesso!");
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      alert(`❌ Erro ao alterar senha: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingPassword(false);
    }
  }

  // Função para resetar dados
  async function handleResetData() {
    if (!window.confirm("⚠️ ATENÇÃO!\n\nIsso irá apagar TODOS os dados do sistema (produtos e vendas).\n\nTem certeza ABSOLUTA que deseja continuar?")) {
      return;
    }
    
    setLoadingReset(true);
    try {
      clearAllData();
      initDefaultProducts();
      
      alert("✅ Dados resetados com sucesso!\nProdutos padrão foram recriados.");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao resetar dados:", error);
      alert("❌ Erro ao resetar dados. Tente novamente.");
    } finally {
      setLoadingReset(false);
      setShowResetConfirm(false);
    }
  }

  // Funções de navegação rápida
  function navigateTo(path) {
    navigate(path);
  }

  const displayName = user?.user_metadata?.name || user?.email || "Usuário";

  return (
    <div className="home-container">
      {/* Header com boas-vindas */}
      <div className="home-header">
        <div className="header-content">
          <div>
            <h1>Dashboard</h1>
            <p className="welcome-text">
              Bem-vindo de volta, <span className="highlight">{displayName}</span>! 👋
            </p>
            <p className="subtitle">Gerencie seu negócio de forma eficiente</p>
          </div>
          
          <div className="header-actions">
            <button 
              className="button btn-primary"
              onClick={() => navigate("/sales")}
            >
              💰 Nova Venda
            </button>
            <button 
              className="logout-button"
              onClick={handleLogout}
            >
              🚪 Sair
            </button>
          </div>
        </div>
      </div>

      {/* Cartões de Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card sales">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total de Vendas</h3>
            <div className="stat-value">{totalSales}</div>
            <div className="stat-subtitle">R$ {totalRevenue.toFixed(2)}</div>
          </div>
          <button 
            className="stat-action"
            onClick={() => navigate("/reports")}
          >
            Ver relatórios →
          </button>
        </div>

        <div className="stat-card products">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Produtos</h3>
            <div className="stat-value">{totalProducts}</div>
            <div className="stat-subtitle">{lowStockProducts} com estoque baixo</div>
          </div>
          <button 
            className="stat-action"
            onClick={() => navigate("/products")}
          >
            Gerenciar estoque →
          </button>
        </div>

        <div className="stat-card performance">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Ticket Médio</h3>
            <div className="stat-value">
              R$ {totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}
            </div>
            <div className="stat-subtitle">por venda</div>
          </div>
        </div>

        <div className="stat-card alerts">
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <h3>Alertas</h3>
            <div className="stat-value">{lowStockProducts}</div>
            <div className="stat-subtitle">
              {lowStockProducts > 0 ? "Produtos precisam de atenção" : "Tudo sob controle"}
            </div>
          </div>
          {lowStockProducts > 0 && (
            <button 
              className="stat-action"
              onClick={() => navigate("/products")}
            >
              Ver produtos →
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="home-grid">
        {/* Perfil do Usuário */}
        <div className="card profile-card">
          <div className="card-header">
            <h2>👤 Perfil do Usuário</h2>
            <span className="badge">Ativo</span>
          </div>
          
          <div className="profile-info">
            <div className="avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-details">
              <h3>{displayName}</h3>
              <p className="email">{user?.email}</p>
              <div className="profile-meta">
                <span className="meta-item">
                  <strong>ID:</strong> {user?.id?.substring(0, 8)}...
                </span>
                <span className="meta-item">
                  <strong>Último login:</strong> Hoje
                </span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button 
              className="button btn-action"
              onClick={() => setEditingName(true)}
            >
              ✏️ Alterar Nome
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingEmail(true)}
            >
              📧 Alterar E-mail
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingPassword(true)}
            >
              🔒 Alterar Senha
            </button>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="card quick-actions-card">
          <div className="card-header">
            <h2>⚡ Ações Rápidas</h2>
          </div>
          
          <div className="quick-actions-grid">
            <button 
              className="quick-action"
              onClick={() => navigate("/sales")}
            >
              <div className="action-icon">💰</div>
              <div className="action-content">
                <h4>Nova Venda</h4>
                <p>Iniciar uma nova venda</p>
              </div>
            </button>

            <button 
              className="quick-action"
              onClick={() => navigate("/products")}
            >
              <div className="action-icon">📦</div>
              <div className="action-content">
                <h4>Adicionar Produto</h4>
                <p>Cadastrar novo produto</p>
              </div>
            </button>

            <button 
              className="quick-action"
              onClick={() => navigate("/reports")}
            >
              <div className="action-icon">📊</div>
              <div className="action-content">
                <h4>Ver Relatórios</h4>
                <p>Analisar desempenho</p>
              </div>
            </button>

            <button 
              className="quick-action"
              onClick={() => window.print()}
            >
              <div className="action-icon">🖨️</div>
              <div className="action-content">
                <h4>Imprimir</h4>
                <p>Imprimir relatórios</p>
              </div>
            </button>
          </div>
        </div>

        {/* Vendas Recentes */}
        <div className="card recent-sales-card">
          <div className="card-header">
            <h2>🛒 Vendas Recentes</h2>
            <button 
              className="button btn-sm btn-secondary"
              onClick={() => navigate("/reports")}
            >
              Ver todas
            </button>
          </div>
          
          {sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <p>Nenhuma venda realizada</p>
              <p className="empty-subtitle">Comece vendendo produtos</p>
              <button 
                className="button btn-primary mt-2"
                onClick={() => navigate("/sales")}
              >
                Realizar primeira venda
              </button>
            </div>
          ) : (
            <div className="sales-list">
              {sales.slice(0, 5).map(sale => {
                const saleDate = new Date(sale.created_at || sale.timestamp || Date.now());
                const itemsCount = sale.items?.length || 0;
                
                return (
                  <div key={sale.id} className="sale-item">
                    <div className="sale-info">
                      <div className="sale-id">#{sale.id.substring(0, 6)}</div>
                      <div className="sale-time">
                        {saleDate.toLocaleDateString('pt-BR')} • 
                        {saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="sale-details">
                      <span className="items-count">{itemsCount} itens</span>
                      <span className="sale-total">R$ {Number(sale.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="sale-payment">
                      {sale.paymentMethod === 'dinheiro' && '💵'}
                      {sale.paymentMethod === 'pix' && '🏦'}
                      {sale.paymentMethod === 'cartao_credito' && '💳'}
                      {sale.paymentMethod === 'cartao_debito' && '💳'}
                      {!sale.paymentMethod && '❓'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Configurações do Sistema */}
        <div className="card system-card">
          <div className="card-header">
            <h2>⚙️ Configurações do Sistema</h2>
          </div>
          
          <div className="system-actions">
            <button 
              className="system-action"
              onClick={() => {
                if (window.confirm("Inicializar produtos padrão?\nIsso adicionará produtos de exemplo.")) {
                  initDefaultProducts();
                  alert("✅ Produtos padrão inicializados!");
                  window.location.reload();
                }
              }}
            >
              <div className="system-icon">🔄</div>
              <div className="system-content">
                <h4>Inicializar Produtos</h4>
                <p>Restaurar produtos de exemplo</p>
              </div>
            </button>

            <button 
              className="system-action"
              onClick={() => setShowResetConfirm(true)}
            >
              <div className="system-icon">🗑️</div>
              <div className="system-content">
                <h4>Resetar Dados</h4>
                <p>Limpar todos os dados do sistema</p>
              </div>
            </button>

            <button 
              className="system-action"
              onClick={() => {
                const data = {
                  products: getProducts(),
                  sales: getSales()
                };
                const jsonString = JSON.stringify(data, null, 2);
                navigator.clipboard.writeText(jsonString);
                alert("✅ Dados copiados para a área de transferência!");
              }}
            >
              <div className="system-icon">📋</div>
              <div className="system-content">
                <h4>Copiar Dados</h4>
                <p>Copiar dados para backup</p>
              </div>
            </button>

            <button 
              className="system-action"
              onClick={() => {
                if (window.confirm("Recarregar página?")) {
                  window.location.reload();
                }
              }}
            >
              <div className="system-icon">🔃</div>
              <div className="system-content">
                <h4>Recarregar Sistema</h4>
                <p>Atualizar página e dados</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modais de Edição */}
      
      {/* Modal: Alterar Nome */}
      {editingName && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>✏️ Alterar Nome</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingName(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveName}>
                <div className="form-group">
                  <label>Novo Nome</label>
                  <input 
                    className="input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome ou nome da empresa" 
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingName}
                  >
                    {loadingName ? "Salvando..." : "💾 Salvar"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingName(false)}
                    disabled={loadingName}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar E-mail */}
      {editingEmail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>📧 Alterar E-mail</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingEmail(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveEmail}>
                <div className="form-group">
                  <label>Novo E-mail</label>
                  <input 
                    className="input" 
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="seu@email.com" 
                    required
                  />
                </div>
                <div className="modal-note">
                  ⚠️ Você receberá um e-mail de confirmação no novo endereço.
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingEmail}
                  >
                    {loadingEmail ? "Enviando..." : "📤 Atualizar"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingEmail(false)}
                    disabled={loadingEmail}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {editingPassword && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔒 Alterar Senha</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingPassword(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={savePassword}>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Digite novamente" 
                    required
                    minLength="6"
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? "Alterando..." : "🔑 Alterar Senha"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingPassword(false)}
                    disabled={loadingPassword}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Reset de Dados */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal danger-modal">
            <div className="modal-header">
              <h3>⚠️ Resetar Todos os Dados</h3>
              <button 
                className="modal-close"
                onClick={() => setShowResetConfirm(false)}
                disabled={loadingReset}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="warning-message">
                <div className="warning-icon">🚨</div>
                <h4>ATENÇÃO: Esta ação é irreversível!</h4>
                <p>Todos os produtos e vendas serão permanentemente apagados.</p>
                <ul className="warning-list">
                  <li>✅ Produtos padrão serão recriados</li>
                  <li>❌ Todas as vendas serão perdidas</li>
                  <li>❌ Todos os produtos serão apagados</li>
                </ul>
              </div>
              <div className="modal-actions">
                <button 
                  className="button btn-danger" 
                  onClick={handleResetData}
                  disabled={loadingReset}
                >
                  {loadingReset ? "Processando..." : "🗑️ SIM, Resetar Dados"}
                </button>
                <button 
                  className="button btn-secondary" 
                  onClick={() => setShowResetConfirm(false)}
                  disabled={loadingReset}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}