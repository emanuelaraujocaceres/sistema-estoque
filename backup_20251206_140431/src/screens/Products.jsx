import { useState } from "react";
import { useProdutos } from "../hooks/useSupabaseData";
import { useBroadcast } from "../hooks/useBroadcast";
import { useMigration } from "../utils/migrateToSupabase";
import { useAuth } from "../auth/AuthContext";
import "./Products.css";

function emptyForm() { 
  return { 
    id: null, 
    nome: "", 
    descricao: "",
    preco_custo: "", 
    preco_venda: "", 
    quantidade: "", 
    quantidade_minima: "",
    codigo_barras: "",
    categoria: "",
    unidade_medida: "un"
  }; 
}

export default function Products() {
  const { user } = useAuth();
  const { 
    produtos, 
    loading, 
    error, 
    create, 
    update, 
    remove, 
    refetch 
  } = useProdutos();
  
  const { sendMessage } = useBroadcast();
  const { migrarProdutos } = useMigration();
  
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showMigration, setShowMigration] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, 
      [name]: value
    }));
  }

  function validateForm() {
    if (!form.nome || !form.nome.trim()) {
      alert("Nome do produto é obrigatório");
      return false;
    }
    
    if (!form.preco_venda || Number(form.preco_venda) <= 0) {
      alert("Preço de venda deve ser maior que zero");
      return false;
    }
    
    const quantidade = Number(form.quantidade) || 0;
    const quantidadeMinima = Number(form.quantidade_minima) || 0;
    
    if (quantidade < 0) {
      alert("Estoque não pode ser negativo");
      return false;
    }
    
    if (quantidadeMinima < 0) {
      alert("Estoque mínimo não pode ser negativo");
      return false;
    }
    
    return true;
  }

  async function handleAdd() {
    try {
      if (!validateForm()) return;

      const produtoData = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || "",
        preco_custo: Number(form.preco_custo) || 0,
        preco_venda: Number(form.preco_venda) || 0,
        quantidade: Math.max(0, Number(form.quantidade) || 0),
        quantidade_minima: Math.max(0, Number(form.quantidade_minima) || 0),
        codigo_barras: form.codigo_barras?.trim() || "",
        categoria: form.categoria?.trim() || "",
        unidade_medida: form.unidade_medida || "un"
      };
      
      const novoProduto = await create(produtoData);
      
      // Enviar broadcast para outros dispositivos
      sendMessage('produto_criado', {
        action: 'produto_adicionado',
        produto: novoProduto,
        userId: user?.id
      });
      
      setForm(emptyForm());
      alert(`✅ Produto "${novoProduto.nome}" adicionado com sucesso!`);
      
    } catch (err) {
      console.error("Erro ao adicionar produto:", err);
      alert(`❌ Erro ao adicionar produto: ${err.message}`);
    }
  }

  function handleEdit(produto) {
    setForm({
      id: produto.id,
      nome: produto.nome || "",
      descricao: produto.descricao || "",
      codigo_barras: produto.codigo_barras || "",
      preco_custo: produto.preco_custo?.toString() || "",
      preco_venda: produto.preco_venda?.toString() || "",
      quantidade: produto.quantidade?.toString() || "",
      quantidade_minima: produto.quantidade_minima?.toString() || "",
      categoria: produto.categoria || "",
      unidade_medida: produto.unidade_medida || "un"
    });
    setEditing(true);
  }

  async function handleSaveEdit() {
    try {
      if (!validateForm()) return;

      const produtoData = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || "",
        preco_custo: Number(form.preco_custo) || 0,
        preco_venda: Number(form.preco_venda) || 0,
        quantidade: Math.max(0, Number(form.quantidade) || 0),
        quantidade_minima: Math.max(0, Number(form.quantidade_minima) || 0),
        codigo_barras: form.codigo_barras?.trim() || "",
        categoria: form.categoria?.trim() || "",
        unidade_medida: form.unidade_medida || "un"
      };
      
      const produtoAtualizado = await update(form.id, produtoData);
      
      // Enviar broadcast para outros dispositivos
      sendMessage('produto_atualizado', {
        action: 'produto_editado',
        produto: produtoAtualizado,
        userId: user?.id
      });
      
      setForm(emptyForm());
      setEditing(false);
      alert(`✅ Produto "${produtoAtualizado.nome}" atualizado com sucesso!`);
      
    } catch (err) {
      console.error("Erro ao atualizar produto:", err);
      alert(`❌ Erro ao atualizar produto: ${err.message}`);
    }
  }

  function handleCancel() {
    setForm(emptyForm());
    setEditing(false);
  }

  async function handleDelete(id, nome) {
    try {
      if (!window.confirm(`⚠️ Tem certeza que deseja excluir o produto "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

      await remove(id);
      
      // Enviar broadcast para outros dispositivos
      sendMessage('produto_removido', {
        action: 'produto_excluido',
        produtoId: id,
        nome: nome,
        userId: user?.id
      });
      
      alert(`🗑️ Produto "${nome}" excluído com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      alert(`❌ Erro ao excluir produto: ${err.message}`);
    }
  }

  // Filtrar e ordenar produtos
  const filteredAndSortedProducts = () => {
    let filtered = [...(produtos || [])];
    
    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.nome?.toLowerCase().includes(query) ||
        p.codigo_barras?.toLowerCase().includes(query) ||
        p.descricao?.toLowerCase().includes(query)
      );
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "nome":
          aValue = a.nome?.toLowerCase() || "";
          bValue = b.nome?.toLowerCase() || "";
          break;
        case "preco_venda":
          aValue = Number(a.preco_venda) || 0;
          bValue = Number(b.preco_venda) || 0;
          break;
        case "quantidade":
          aValue = Number(a.quantidade) || 0;
          bValue = Number(b.quantidade) || 0;
          break;
        case "atualizado_em":
          aValue = new Date(a.atualizado_em || a.criado_em || 0).getTime();
          bValue = new Date(b.atualizado_em || b.criado_em || 0).getTime();
          break;
        default:
          aValue = a.nome?.toLowerCase() || "";
          bValue = b.nome?.toLowerCase() || "";
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    return filtered;
  };

  // Calcular estatísticas
  const statistics = {
    totalProducts: produtos?.length || 0,
    lowStock: produtos?.filter(p => p.quantidade <= (p.quantidade_minima || 0) || p.quantidade <= 3).length || 0,
    outOfStock: produtos?.filter(p => p.quantidade <= 0).length || 0,
    totalValue: produtos?.reduce((sum, p) => sum + (p.quantidade * (p.preco_custo || 0)), 0) || 0
  };

  // Verificar se há dados locais para migrar
  const hasLocalData = () => {
    const produtosLocais = localStorage.getItem('produtos');
    return produtosLocais && JSON.parse(produtosLocais).length > 0;
  };

  if (loading && produtos.length === 0) {
    return (
      <div className="products-container loading">
        <div className="spinner"></div>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="products-container">
      {/* Botão de Migração (se houver dados locais) */}
      {hasLocalData() && (
        <div className="migration-banner">
          <div className="migration-content">
            <span>🔄 Você tem dados locais que podem ser migrados para a nuvem!</span>
            <button 
              className="button btn-primary btn-sm"
              onClick={() => setShowMigration(true)}
            >
              Migrar Agora
            </button>
          </div>
        </div>
      )}

      {/* Modal de Migração */}
      {showMigration && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔄 Migrar para Nuvem</h3>
              <button className="modal-close" onClick={() => setShowMigration(false)}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="migration-info">
                <p>Migrar todos os produtos do <strong>localStorage</strong> para o <strong>Supabase</strong>.</p>
                <p><strong>Benefícios:</strong></p>
                <ul>
                  <li>✅ Sincronização entre dispositivos</li>
                  <li>✅ Backup automático</li>
                  <li>✅ Acesso de qualquer lugar</li>
                  <li>✅ Trabalho em equipe</li>
                </ul>
                <p><strong>Atenção:</strong> Após migrar, os dados locais serão removidos.</p>
                
                <div className="modal-actions">
                  <button 
                    className="button btn-primary"
                    onClick={async () => {
                      const resultado = await migrarProdutos();
                      alert(resultado.message);
                      setShowMigration(false);
                      refetch(); // Recarregar produtos
                    }}
                  >
                    Iniciar Migração
                  </button>
                  <button 
                    className="button btn-secondary"
                    onClick={() => setShowMigration(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header com estatísticas */}
      <div className="products-header">
        <div>
          <h1>📦 Gerenciamento de Estoque</h1>
          <p className="subtitle">
            {produtos?.length || 0} produtos cadastrados • Sincronizado em tempo real
          </p>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalProducts}</div>
              <div className="stat-label">Produtos</div>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.lowStock}</div>
              <div className="stat-label">Estoque Baixo</div>
            </div>
          </div>
          
          <div className="stat-card danger">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.outOfStock}</div>
              <div className="stat-label">Sem Estoque</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error.message}</span>
          <button onClick={refetch} className="button btn-sm btn-secondary">
            Tentar Novamente
          </button>
        </div>
      )}

      {/* FORM */}
      <div className="card form-card">
        <h3 className="form-title">
          {editing ? (
            <>
              <span className="form-icon">✏️</span> 
              Editar Produto
            </>
          ) : (
            <>
              <span className="form-icon">➕</span> 
              Adicionar Novo Produto
            </>
          )}
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label>
              Nome do Produto *
              <span className="required"> *</span>
            </label>
            <input
              className="input"
              name="nome"
              placeholder="Ex: Café Premium 500g"
              value={form.nome}
              onChange={handleChange}
              maxLength="100"
            />
          </div>

          <div className="form-group">
            <label>Código (SKU/Código de Barras)</label>
            <input 
              className="input" 
              name="codigo_barras"
              placeholder="Ex: CAF-500-PRM ou 7891234567890"
              value={form.codigo_barras} 
              onChange={handleChange} 
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea 
              className="input" 
              name="descricao"
              placeholder="Descrição detalhada do produto..."
              value={form.descricao} 
              onChange={handleChange} 
              rows="2"
              maxLength="500"
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <input 
              className="input" 
              name="categoria"
              placeholder="Ex: Bebidas, Limpeza, etc."
              value={form.categoria} 
              onChange={handleChange} 
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label>
              Custo (R$)
              <span className="helper">Custo de aquisição</span>
            </label>
            <input 
              className="input" 
              type="number" 
              name="preco_custo" 
              min="0" 
              step="0.01"
              placeholder="0,00"
              value={form.preco_custo} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>
              Preço de Venda (R$) *
              <span className="helper">Preço para o cliente</span>
              <span className="required"> *</span>
            </label>
            <input 
              className="input" 
              type="number" 
              name="preco_venda" 
              min="0.01" 
              step="0.01"
              placeholder="0,00"
              value={form.preco_venda} 
              onChange={handleChange} 
              required
            />
          </div>

          <div className="form-group">
            <label>
              Estoque Atual
              <span className="helper">Quantidade disponível</span>
            </label>
            <input 
              className="input" 
              type="number" 
              name="quantidade" 
              min="0"
              placeholder="0"
              value={form.quantidade} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>
              Estoque Mínimo
              <span className="helper">Alerta quando atingir</span>
            </label>
            <input 
              className="input" 
              type="number" 
              name="quantidade_minima" 
              min="0"
              placeholder="0"
              value={form.quantidade_minima} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>Unidade de Medida</label>
            <select 
              className="input" 
              name="unidade_medida"
              value={form.unidade_medida} 
              onChange={handleChange}
            >
              <option value="un">Unidade (un)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="g">Grama (g)</option>
              <option value="L">Litro (L)</option>
              <option value="ml">Mililitro (ml)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="pct">Pacote (pct)</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          {editing ? (
            <>
              <button 
                className="button btn-success" 
                onClick={handleSaveEdit}
              >
                💾 Salvar Alterações
              </button>
              <button 
                className="button btn-secondary" 
                onClick={handleCancel}
              >
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button 
              className="button btn-primary" 
              onClick={handleAdd}
            >
              ➕ Adicionar Produto
            </button>
          )}
        </div>
        
        <div className="form-footer">
          <small>Campos marcados com * são obrigatórios</small>
        </div>
      </div>

      {/* CONTROLES DE LISTA */}
      <div className="card controls-card">
        <div className="controls-header">
          <h3>📋 Produtos Cadastrados</h3>
          <div className="controls-actions">
            <button 
              className="button btn-secondary" 
              onClick={refetch}
              disabled={loading}
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="controls-filters">
          <div className="search-box">
            <input
              type="text"
              className="input search-input"
              placeholder="Buscar por nome, código ou descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => setSearchQuery("")}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sort-controls">
            <select 
              className="input select-sm" 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="nome">Nome</option>
              <option value="preco_venda">Preço</option>
              <option value="quantidade">Estoque</option>
              <option value="atualizado_em">Última atualização</option>
            </select>
            
            <button 
              className={`sort-order-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="list-stats">
          <span className="stat-item">
            <strong>{filteredAndSortedProducts().length}</strong> de <strong>{produtos?.length || 0}</strong> produtos
          </span>
          {searchQuery && (
            <span className="stat-item">
              Buscando: "{searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="card list-card">
        {filteredAndSortedProducts().length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {searchQuery ? "🔍" : "📦"}
            </div>
            <h4>
              {searchQuery 
                ? "Nenhum produto encontrado" 
                : produtos?.length === 0 
                  ? "Nenhum produto cadastrado" 
                  : "Produtos carregados"}
            </h4>
            <p>
              {searchQuery 
                ? `Nenhum produto corresponde à busca "${searchQuery}"`
                : produtos?.length === 0
                  ? "Adicione seu primeiro produto usando o formulário acima"
                  : "Use os filtros acima para buscar produtos"}
            </p>
            {searchQuery && (
              <button 
                className="button btn-secondary mt-2" 
                onClick={() => setSearchQuery("")}
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Custo</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th className="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts().map(p => {
                  const isLowStock = p.quantidade <= (p.quantidade_minima || 0) || p.quantidade <= 3;
                  const isOutOfStock = p.quantidade <= 0;
                  
                  return (
                    <tr key={p.id} className={isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : ''}>
                      <td className="product-cell">
                        <div className="product-main">
                          <strong>{p.nome}</strong>
                          {p.codigo_barras && <div className="sku-text">Código: {p.codigo_barras}</div>}
                          {p.descricao && <div className="desc-text">{p.descricao}</div>}
                          {p.categoria && <div className="category-badge">{p.categoria}</div>}
                        </div>
                        {p.atualizado_em && (
                          <div className="update-time">
                            Atualizado: {new Date(p.atualizado_em).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      
                      <td className="cost-cell">
                        <div className="price-display">
                          R$ {Number(p.preco_custo || 0).toFixed(2)}
                        </div>
                      </td>
                      
                      <td className="price-cell">
                        <div className="price-display highlight">
                          R$ {Number(p.preco_venda || 0).toFixed(2)}
                        </div>
                        {p.preco_custo > 0 && (
                          <div className="margin-info">
                            Margem: {((p.preco_venda - p.preco_custo) / p.preco_custo * 100).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      
                      <td className="stock-cell">
                        <div className="stock-display">
                          <span className={`stock-badge ${isOutOfStock ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-ok'}`}>
                            {p.quantidade || 0} {p.unidade_medida || 'un'}
                          </span>
                          {p.quantidade_minima > 0 && (
                            <div className="min-stock">
                              Mín: {p.quantidade_minima}
                            </div>
                          )}
                        </div>
                        <div className="stock-value">
                          Valor: R$ {(p.quantidade * (p.preco_custo || 0)).toFixed(2)}
                        </div>
                      </td>
                      
                      <td className="status-cell">
                        <div className={`status-badge ${isOutOfStock ? 'status-danger' : isLowStock ? 'status-warning' : 'status-success'}`}>
                          {isOutOfStock ? 'ESGOTADO' : isLowStock ? 'BAIXO' : 'OK'}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="actions-buttons">
                          <button 
                            className="button btn-edit" 
                            onClick={() => handleEdit(p)}
                            title="Editar produto"
                          >
                            ✏️
                          </button>
                          <button 
                            className="button btn-danger" 
                            onClick={() => handleDelete(p.id, p.nome)}
                            title="Excluir produto"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESUMO DO VALOR DO ESTOQUE */}
      <div className="card summary-card">
        <h3>💰 Resumo do Valor do Estoque</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-label">Valor Total do Estoque (Custo)</div>
            <div className="summary-value">R$ {statistics.totalValue.toFixed(2)}</div>
            <div className="summary-sub">Custo de aquisição</div>
          </div>
          
          <div className="summary-item">
            <div className="summary-label">Valor de Venda Total</div>
            <div className="summary-value">
              R$ {(produtos?.reduce((sum, p) => sum + (p.quantidade * (p.preco_venda || 0)), 0) || 0).toFixed(2)}
            </div>
            <div className="summary-sub">Preço de venda</div>
          </div>
          
          <div className="summary-item">
            <div className="summary-label">Lucro Potencial</div>
            <div className="summary-value success">
              R$ {(produtos?.reduce((sum, p) => sum + (p.quantidade * ((p.preco_venda || 0) - (p.preco_custo || 0))), 0) || 0).toFixed(2)}
            </div>
            <div className="summary-sub">Diferença total</div>
          </div>
        </div>
      </div>
    </div>
  );
}