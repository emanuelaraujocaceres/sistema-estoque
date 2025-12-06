import { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, initDefaultProducts, exportData } from "../services/storage";
import "./Products.css";

function emptyForm() { 
  return { 
    id: null, 
    name: "", 
    cost: "", 
    price: "", 
    stock: "", 
    min_stock: "",
    sku: ""
  }; 
}

export default function Products() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    try {
      initDefaultProducts();
      const products = getProducts();
      if (!Array.isArray(products)) {
        throw new Error("Dados de produtos inválidos");
      }
      setList(products);
    } catch (error) {
      console.error("Erro ao inicializar produtos:", error);
      setError("Erro ao carregar produtos. Verifique o console.");
      setList([]);
    }
  }, []);

  // ====== FUNÇÃO SIMPLES PARA REPOR ESTOQUE ======
  const handleRestock = (productId, productName) => {
    const currentProduct = list.find(p => p.id === productId);
    if (!currentProduct) return;
    
    const quantity = prompt(
      `📦 Repor estoque de "${productName}"\n\n` +
      `Estoque atual: ${currentProduct.stock} unidades\n` +
      `Digite quantas unidades deseja ADICIONAR:`,
      "10"
    );
    
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
      return; // Usuário cancelou ou valor inválido
    }
    
    const addQty = parseInt(quantity);
    
    // Atualizar no localStorage
    const products = getProducts();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock: p.stock + addQty,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    // Atualizar estado
    setList(updatedProducts);
    
    // Feedback visual
    alert(`✅ ${addQty} unidades adicionadas ao estoque de "${productName}"!\n\nNovo estoque: ${currentProduct.stock + addQty} unidades`);
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, 
      [name]: value
    }));
  }

  function validateForm() {
    if (!form.name || !form.name.trim()) {
      setError("Nome do produto é obrigatório");
      return false;
    }
    
    if (!form.price || Number(form.price) <= 0) {
      setError("Preço de venda deve ser maior que zero");
      return false;
    }
    
    const stock = Number(form.stock) || 0;
    const minStock = Number(form.min_stock) || 0;
    
    if (stock < 0) {
      setError("Estoque não pode ser negativo");
      return false;
    }
    
    if (minStock < 0) {
      setError("Estoque mínimo não pode ser negativo");
      return false;
    }
    
    return true;
  }

  function handleAdd() {
    try {
      setError(null);
      
      if (!validateForm()) return;

      setLoading(true);

      const prod = { 
        ...form, 
        id: Date.now(),
        name: form.name.trim(),
        sku: form.sku?.trim() || "",
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Math.max(0, Number(form.stock) || 0),
        min_stock: Math.max(0, Number(form.min_stock) || 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newProduct = addProduct(prod);
      
      if (!newProduct) {
        throw new Error("Falha ao adicionar produto");
      }
      
      setList(getProducts());
      setForm(emptyForm());
      setError(null);
      
      // Feedback visual
      alert(`✅ Produto "${prod.name}" adicionado com sucesso!`);
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      setError(`Erro ao adicionar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(p) {
    try {
      setForm({
        id: p.id,
        name: p.name || "",
        sku: p.sku || "",
        price: p.price?.toString() || "",
        cost: p.cost?.toString() || "",
        stock: p.stock?.toString() || "",
        min_stock: p.min_stock?.toString() || ""
      });
      setEditing(true);
      setError(null);
      // Scroll to form
      document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error("Erro ao preparar edição:", error);
      setError("Erro ao carregar dados do produto para edição");
    }
  }

  function handleSaveEdit() {
    try {
      setError(null);
      
      if (!validateForm()) return;

      setLoading(true);

      const updatedProduct = {
        ...form,
        name: form.name.trim(),
        sku: form.sku?.trim() || "",
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Math.max(0, Number(form.stock) || 0),
        min_stock: Math.max(0, Number(form.min_stock) || 0),
        updated_at: new Date().toISOString()
      };
      
      const success = updateProduct(form.id, updatedProduct);
      
      if (!success) {
        throw new Error("Falha ao atualizar produto");
      }
      
      setList(getProducts());
      setForm(emptyForm());
      setEditing(false);
      setError(null);
      
      alert(`✅ Produto "${updatedProduct.name}" atualizado com sucesso!`);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      setError(`Erro ao atualizar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setForm(emptyForm());
    setEditing(false);
    setError(null);
  }

  function handleDelete(id, name) {
    try {
      if (!window.confirm(`⚠️ Tem certeza que deseja excluir o produto "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;

      const success = deleteProduct(id);
      
      if (!success) {
        throw new Error("Falha ao excluir produto");
      }
      
      setList(getProducts());
      alert(`🗑️ Produto "${name}" excluído com sucesso!`);
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert(`❌ Erro ao excluir produto: ${error.message}`);
    }
  }

  function handleExport() {
    try {
      exportData();
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      alert("Erro ao exportar dados");
    }
  }

  // Filtrar e ordenar produtos
  const filteredAndSortedProducts = () => {
    let filtered = [...list];
    
    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "price":
          aValue = Number(a.price) || 0;
          bValue = Number(b.price) || 0;
          break;
        case "stock":
          aValue = Number(a.stock) || 0;
          bValue = Number(b.stock) || 0;
          break;
        case "last_update":
          aValue = new Date(a.updated_at || a.created_at || 0).getTime();
          bValue = new Date(b.updated_at || b.created_at || 0).getTime();
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
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
    totalProducts: list.length,
    lowStock: list.filter(p => p.stock <= (p.min_stock || 0) || p.stock <= 3).length,
    outOfStock: list.filter(p => p.stock <= 0).length,
    totalValue: list.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0)
  };

  return (
    <div className="products-container">
      {/* Header com estatísticas */}
      <div className="products-header">
        <div>
          <h1>📦 Gerenciamento de Estoque</h1>
          <p className="subtitle">Gerencie todos os produtos do seu estoque</p>
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
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="button btn-sm btn-secondary">
            Fechar
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
              name="name"
              placeholder="Ex: Café Premium 500g"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              maxLength="100"
            />
          </div>

          <div className="form-group">
            <label>Código (SKU)</label>
            <input 
              className="input" 
              name="sku"
              placeholder="Ex: CAF-500-PRM"
              value={form.sku} 
              onChange={handleChange} 
              disabled={loading}
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
              name="cost" 
              min="0" 
              step="0.01"
              placeholder="0,00"
              value={form.cost} 
              onChange={handleChange} 
              disabled={loading}
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
              name="price" 
              min="0.01" 
              step="0.01"
              placeholder="0,00"
              value={form.price} 
              onChange={handleChange} 
              disabled={loading}
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
              name="stock" 
              min="0"
              placeholder="0"
              value={form.stock} 
              onChange={handleChange} 
              disabled={loading}
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
              name="min_stock" 
              min="0"
              placeholder="0"
              value={form.min_stock} 
              onChange={handleChange} 
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          {editing ? (
            <>
              <button 
                className="button btn-success" 
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? "Salvando..." : "💾 Salvar Alterações"}
              </button>
              <button 
                className="button btn-secondary" 
                onClick={handleCancel}
                disabled={loading}
              >
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button 
              className="button btn-primary" 
              onClick={handleAdd}
              disabled={loading}
            >
              {loading ? "Adicionando..." : "➕ Adicionar Produto"}
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
              onClick={() => setList(getProducts())}
              disabled={loading}
            >
              🔄 Atualizar
            </button>
            <button 
              className="button btn-success" 
              onClick={handleExport}
              disabled={loading}
            >
              📤 Exportar
            </button>
          </div>
        </div>

        <div className="controls-filters">
          <div className="search-box">
            <input
              type="text"
              className="input search-input"
              placeholder="Buscar por nome ou SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={loading}
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
              disabled={loading}
            >
              <option value="name">Nome</option>
              <option value="price">Preço</option>
              <option value="stock">Estoque</option>
              <option value="last_update">Última atualização</option>
            </select>
            
            <button 
              className={`sort-order-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              disabled={loading}
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="list-stats">
          <span className="stat-item">
            <strong>{filteredAndSortedProducts().length}</strong> de <strong>{list.length}</strong> produtos
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
                : "Nenhum produto cadastrado"}
            </h4>
            <p>
              {searchQuery 
                ? `Nenhum produto corresponde à busca "${searchQuery}"`
                : "Adicione seu primeiro produto usando o formulário acima"}
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
                  const isLowStock = p.stock <= (p.min_stock || 0) || p.stock <= 3;
                  const isOutOfStock = p.stock <= 0;
                  
                  return (
                    <tr key={p.id} className={isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : ''}>
                      <td className="product-cell">
                        <div className="product-main">
                          <strong>{p.name}</strong>
                          {p.sku && <div className="sku-text">SKU: {p.sku}</div>}
                        </div>
                        {p.updated_at && (
                          <div className="update-time">
                            Atualizado: {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      
                      <td className="cost-cell">
                        <div className="price-display">
                          R$ {Number(p.cost || 0).toFixed(2)}
                        </div>
                      </td>
                      
                      <td className="price-cell">
                        <div className="price-display highlight">
                          R$ {Number(p.price || 0).toFixed(2)}
                        </div>
                        {p.cost > 0 && (
                          <div className="margin-info">
                            Margem: {((p.price - p.cost) / p.cost * 100).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      
                      <td className="stock-cell">
                        <div className="stock-display">
                          <span className={`stock-badge ${isOutOfStock ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-ok'}`}>
                            {p.stock || 0}
                          </span>
                          {p.min_stock > 0 && (
                            <div className="min-stock">
                              Mín: {p.min_stock}
                            </div>
                          )}
                        </div>
                        <div className="stock-value">
                          Valor: R$ {(p.stock * (p.cost || 0)).toFixed(2)}
                        </div>
                      </td>
                      
                      <td className="status-cell">
                        <div className={`status-badge ${isOutOfStock ? 'status-danger' : isLowStock ? 'status-warning' : 'status-success'}`}>
                          {isOutOfStock ? 'ESGOTADO' : isLowStock ? 'BAIXO' : 'OK'}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="actions-buttons">
                          {/* BOTÃO DE REPOR ESTOQUE ADICIONADO AQUI */}
                          <button 
                            className="button btn-info" 
                            onClick={() => handleRestock(p.id, p.name)}
                            disabled={loading}
                            title="Repor estoque deste produto"
                          >
                            📦
                          </button>
                          
                          <button 
                            className="button btn-edit" 
                            onClick={() => handleEdit(p)}
                            disabled={loading}
                            title="Editar produto"
                          >
                            ✏️
                          </button>
                          <button 
                            className="button btn-danger" 
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={loading}
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
            <div className="summary-label">Valor Total do Estoque</div>
            <div className="summary-value">R$ {statistics.totalValue.toFixed(2)}</div>
            <div className="summary-sub">Custo de aquisição</div>
          </div>
          
          <div className="summary-item">
            <div className="summary-label">Valor de Venda Total</div>
            <div className="summary-value">
              R$ {list.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0).toFixed(2)}
            </div>
            <div className="summary-sub">Preço de venda</div>
          </div>
          
          <div className="summary-item">
            <div className="summary-label">Lucro Potencial</div>
            <div className="summary-value success">
              R$ {list.reduce((sum, p) => sum + (p.stock * ((p.price || 0) - (p.cost || 0))), 0).toFixed(2)}
            </div>
            <div className="summary-sub">Diferença total</div>
          </div>
        </div>
      </div>
    </div>
  );
}