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
    sku: "",
    category: "",
    image: ""
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
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [bulkStockMode, setBulkStockMode] = useState(false);
  const [bulkStockUpdates, setBulkStockUpdates] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      initDefaultProducts();
      const products = getProducts();
      if (!Array.isArray(products)) {
        throw new Error("Dados de produtos inválidos");
      }
      setList(products);
      
      // Inicializar updates para modo bulk
      const initialUpdates = {};
      products.forEach(p => {
        initialUpdates[p.id] = 0;
      });
      setBulkStockUpdates(initialUpdates);
    } catch (error) {
      console.error("Erro ao inicializar produtos:", error);
      setError("Erro ao carregar produtos. Verifique o console.");
      setList([]);
    }
  }, []);

  // ====== FUNÇÕES DE ESTOQUE ======

  // 1. Repor estoque com prompt simples
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
    applyStockUpdate(productId, addQty);
  };

  // 2. Modal para adicionar estoque com opções rápidas
  const openStockModal = (product) => {
    setStockModalProduct(product);
    setShowStockModal(true);
  };

  // 3. Adicionar estoque rápido com botões +1, +5, +10
  const quickAddStock = (productId, quantity) => {
    applyStockUpdate(productId, quantity);
  };

  // 4. Aplicar atualização de estoque
  const applyStockUpdate = (productId, quantity) => {
    const products = getProducts();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const newStock = p.stock + quantity;
        return {
          ...p,
          stock: Math.max(0, newStock),
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    setList(updatedProducts);
    
    // Feedback visual
    const product = products.find(p => p.id === productId);
    if (product) {
      showNotification(`✅ ${quantity} unidades adicionadas ao estoque de "${product.name}"!`, 'success');
    }
  };

  // 5. Modo bulk para adicionar estoque em vários produtos
  const toggleBulkStockMode = () => {
    setBulkStockMode(!bulkStockMode);
    if (!bulkStockMode) {
      // Reiniciar contadores quando entrar no modo bulk
      const initialUpdates = {};
      list.forEach(p => {
        initialUpdates[p.id] = 0;
      });
      setBulkStockUpdates(initialUpdates);
    }
  };

  // 6. Atualizar contador no modo bulk
  const updateBulkStock = (productId, change) => {
    setBulkStockUpdates(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change)
    }));
  };

  // 7. Aplicar todas as atualizações em bulk
  const applyBulkStock = () => {
    const hasUpdates = Object.values(bulkStockUpdates).some(val => val > 0);
    if (!hasUpdates) {
      showNotification("⚠️ Nenhuma alteração de estoque foi feita.", 'warning');
      return;
    }

    const products = getProducts();
    const updatedProducts = products.map(p => {
      const addQty = bulkStockUpdates[p.id] || 0;
      if (addQty > 0) {
        return {
          ...p,
          stock: p.stock + addQty,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    setList(updatedProducts);
    
    // Resetar modo bulk
    setBulkStockMode(false);
    const resetUpdates = {};
    updatedProducts.forEach(p => {
      resetUpdates[p.id] = 0;
    });
    setBulkStockUpdates(resetUpdates);
    
    showNotification(`✅ Estoque atualizado em ${Object.values(bulkStockUpdates).filter(v => v > 0).length} produtos!`, 'success');
  };

  // Função para mostrar notificações
  const showNotification = (message, type = 'info') => {
    // Cria elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        ${message}
        <button class="notification-close">×</button>
      </div>
    `;
    
    // Estilos para a notificação
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#2ecc71' : type === 'warning' ? '#f39c12' : '#3498db'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideInRight 0.3s ease;
    `;
    
    const contentStyle = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
    `;
    
    const closeButtonStyle = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    `;
    
    notification.querySelector('.notification-content').style.cssText = contentStyle;
    notification.querySelector('.notification-close').style.cssText = closeButtonStyle;
    
    // Adiciona ao DOM
    document.body.appendChild(notification);
    
    // Configura botão de fechar
    notification.querySelector('.notification-close').onclick = () => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };
    
    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  };

    // Converter arquivo de imagem para base64 e salvar no formulário
    function handleImageChange(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem válido');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, image: reader.result }));
      };
      reader.onerror = (err) => {
        console.error('Erro ao ler arquivo de imagem:', err);
        setError('Erro ao processar a imagem');
      };
      reader.readAsDataURL(file);
    }

  // ====== FUNÇÕES EXISTENTES ======

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
        sku: form.sku?.trim() || `PROD${Date.now()}`,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Math.max(0, Number(form.stock) || 0),
        min_stock: Math.max(0, Number(form.min_stock) || 0),
        image: form.image || undefined,
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
      
      showNotification(`✅ Produto "${prod.name}" adicionado com sucesso!`, 'success');
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
        min_stock: p.min_stock?.toString() || "",
        image: p.image || ""
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
        image: form.image || undefined,
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
      
      showNotification(`✅ Produto "${updatedProduct.name}" atualizado com sucesso!`, 'success');
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
      showNotification(`🗑️ Produto "${name}" excluído com sucesso!`, 'warning');
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      showNotification(`❌ Erro ao excluir produto: ${error.message}`, 'error');
    }
  }

  function handleExport() {
    try {
      exportData();
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      showNotification("Erro ao exportar dados", 'error');
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

  // Aplica filtro de topo (all | low | out)
  const applyTopFilter = (items) => {
    if (!filter || filter === 'all') return items;
    if (filter === 'low') return items.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 3));
    if (filter === 'out') return items.filter(p => p.stock <= 0);
    return items;
  };

  // Define filtro e rola até a lista de produtos
  const setFilterAndScroll = (f) => {
    setFilter(f);
    setTimeout(() => {
      const el = document.querySelector('.list-card');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Calcular estatísticas
  const statistics = {
    totalProducts: list.length,
    lowStock: list.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 3)).length,
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
          <button
            className={`stat-card ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('all')}
            aria-label="Mostrar todos os produtos"
            type="button"
          >
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalProducts}</div>
              <div className="stat-label">Produtos</div>
            </div>
          </button>

          <button
            className={`stat-card warning ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('low')}
            aria-label="Mostrar produtos com estoque baixo"
            type="button"
          >
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.lowStock}</div>
              <div className="stat-label">Estoque Baixo</div>
            </div>
          </button>

          <button
            className={`stat-card danger ${filter === 'out' ? 'active' : ''}`}
            onClick={() => setFilterAndScroll('out')}
            aria-label="Mostrar produtos sem estoque"
            type="button"
          >
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.outOfStock}</div>
              <div className="stat-label">Sem Estoque</div>
            </div>
          </button>
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

      {/* Ações rápidas removidas para reduzir poluição visual */}

      {/* Modo Bulk Stock */}
      {bulkStockMode && (
        <div className="card bulk-stock-card">
          <div className="bulk-stock-header">
            <h3 className="form-title">
              <span className="form-icon">📦</span> 
              Adicionar Estoque em Massa
            </h3>
            <button 
              className="button btn-danger btn-sm"
              onClick={toggleBulkStockMode}
            >
              ❌ Sair do Modo Massa
            </button>
          </div>
          
          <div className="bulk-stock-info">
            <p>⏺️ Selecione a quantidade para cada produto e clique em "Aplicar"</p>
            <div className="bulk-stats">
              <span className="stat-badge">
                <strong>{Object.values(bulkStockUpdates).filter(v => v > 0).length}</strong> produtos para atualizar
              </span>
              <span className="stat-badge">
                <strong>{Object.values(bulkStockUpdates).reduce((a, b) => a + b, 0)}</strong> unidades totais
              </span>
            </div>
          </div>

          <div className="bulk-stock-controls">
            <button 
              className="button btn-secondary"
              onClick={() => {
                const resetUpdates = {};
                list.forEach(p => {
                  resetUpdates[p.id] = 0;
                });
                setBulkStockUpdates(resetUpdates);
              }}
            >
              🔄 Limpar Tudo
            </button>
            <button 
              className="button btn-success"
              onClick={applyBulkStock}
            >
              ✅ Aplicar Estoque em Massa
            </button>
          </div>
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
            <label>Imagem do Produto</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {form.image && (
              <div className="image-preview">
                <img src={form.image} alt="Pré-visualização" />
              </div>
            )}
            <small className="helper-text">Opcional — será exibida como miniatura na lista</small>
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
            <div className="stock-input-group">
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
              <div className="quick-stock-buttons">
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 1 }))}
                >
                  +1
                </button>
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 5 }))}
                >
                  +5
                </button>
                <button 
                  type="button" 
                  className="quick-stock-btn"
                  onClick={() => setForm(f => ({ ...f, stock: (parseInt(f.stock) || 0) + 10 }))}
                >
                  +10
                </button>
              </div>
            </div>
            <small className="helper-text">
              💡 Você pode adicionar o produto com estoque 0 e incrementar depois!
            </small>
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
            <>
              <button 
                className="button btn-primary" 
                onClick={handleAdd}
                disabled={loading}
              >
                {loading ? "Adicionando..." : "➕ Adicionar Produto (Pode ser 0 estoque)"}
              </button>
              <button 
                className="button btn-secondary" 
                onClick={() => {
                  // Preenche com valores de exemplo
                  setForm({
                    ...emptyForm(),
                    name: "Novo Produto",
                    sku: `PROD${Date.now()}`,
                    price: "99.99",
                    cost: "50.00",
                    stock: "0",
                    min_stock: "5"
                  });
                }}
              >
                🎯 Preencher Exemplo
              </button>
            </>
          )}
        </div>
        
        <div className="form-footer">
          <small>Campos marcados com * são obrigatórios. Produtos podem ser adicionados com estoque 0!</small>
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
            <strong>{applyTopFilter(filteredAndSortedProducts()).length}</strong> de <strong>{list.length}</strong> produtos
          </span>
          {searchQuery && (
            <span className="stat-item">
              Buscando: "{searchQuery}"
            </span>
          )}
          {bulkStockMode && (
            <span className="stat-item warning">
              ⚠️ Modo massa ativo - Clique nos botões + para adicionar estoque
            </span>
          )}
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="card list-card">
        {applyTopFilter(filteredAndSortedProducts()).length === 0 ? (
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
                {applyTopFilter(filteredAndSortedProducts()).map(p => {
                  const isLowStock = p.stock <= (p.min_stock || 0) || p.stock <= 3;
                  const isOutOfStock = p.stock <= 0;
                  const bulkQuantity = bulkStockUpdates[p.id] || 0;
                  
                  return (
                    <tr key={p.id} className={isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : ''}>
                      <td className="product-cell">
                        <div className="product-main">
                          {p.image ? (
                            <div className="product-thumb">
                              <img src={p.image} alt={p.name} />
                            </div>
                          ) : null}
                          <div>
                            <strong>{p.name}</strong>
                            {p.sku && <div className="sku-text">SKU: {p.sku}</div>}
                          </div>
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
                        
                        {/* Controles de estoque rápido - SEM BOTÕES +1 e +5 */}
                        {bulkStockMode ? (
                          <div className="bulk-stock-controls-row">
                            <div className="bulk-quantity">
                              <button 
                                className="bulk-btn minus"
                                onClick={() => updateBulkStock(p.id, -1)}
                              >
                                -
                              </button>
                              <span className="bulk-number">{bulkQuantity}</span>
                              <button 
                                className="bulk-btn plus"
                                onClick={() => updateBulkStock(p.id, 1)}
                              >
                                +
                              </button>
                            </div>
                            <small>Adicionar: {bulkQuantity} unidades</small>
                          </div>
                        ) : (
                          <div className="quick-stock-controls">
                            <button 
                              className="button btn-sm btn-info"
                              onClick={() => handleRestock(p.id, p.name)}
                              title="Repor estoque"
                            >
                              ➕ Repor Estoque
                            </button>
                          </div>
                        )}
                      </td>
                      
                      <td className="status-cell">
                        <div className={`status-badge ${isOutOfStock ? 'status-danger' : isLowStock ? 'status-warning' : 'status-success'}`}>
                          {isOutOfStock ? 'ESGOTADO' : isLowStock ? 'BAIXO' : 'OK'}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="actions-buttons">
                          {/* Botão principal de repor estoque */}
                          <button 
                            className="button btn-success" 
                            onClick={() => handleRestock(p.id, p.name)}
                            disabled={loading}
                            title="Repor estoque deste produto"
                          >
                            ➕ Estoque
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

      {/* Resumo de valor do estoque removido daqui — ficará disponível apenas em Relatórios */}

      {/* Modal para adicionar estoque */}
      {showStockModal && stockModalProduct && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Adicionar Estoque: {stockModalProduct.name}</h3>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Estoque atual: <strong>{stockModalProduct.stock}</strong> unidades</p>
              
              <div className="modal-stock-options">
                <div className="modal-stock-grid">
                  <button 
                    className="modal-stock-option"
                    onClick={() => {
                      quickAddStock(stockModalProduct.id, 1);
                      setShowStockModal(false);
                    }}
                  >
                    <span className="option-icon">➕</span>
                    <span className="option-title">+1 Unidade</span>
                    <span className="option-desc">Estoque: {stockModalProduct.stock + 1}</span>
                  </button>
                  
                  <button 
                    className="modal-stock-option"
                    onClick={() => {
                      quickAddStock(stockModalProduct.id, 5);
                      setShowStockModal(false);
                    }}
                  >
                    <span className="option-icon">📦</span>
                    <span className="option-title">+5 Unidades</span>
                    <span className="option-desc">Estoque: {stockModalProduct.stock + 5}</span>
                  </button>
                  
                  <button 
                    className="modal-stock-option"
                    onClick={() => {
                      quickAddStock(stockModalProduct.id, 10);
                      setShowStockModal(false);
                    }}
                  >
                    <span className="option-icon">📊</span>
                    <span className="option-title">+10 Unidades</span>
                    <span className="option-desc">Estoque: {stockModalProduct.stock + 10}</span>
                  </button>
                  
                  <button 
                    className="modal-stock-option"
                    onClick={() => {
                      openStockModal(stockModalProduct);
                      setShowStockModal(false);
                    }}
                  >
                    <span className="option-icon">🔢</span>
                    <span className="option-title">Quantidade Customizada</span>
                    <span className="option-desc">Definir valor manual</span>
                  </button>
                </div>
                
                <div className="modal-custom">
                  <input
                    type="number"
                    className="input"
                    placeholder="Digite a quantidade"
                    min="1"
                    id="customQuantity"
                  />
                  <button 
                    className="button btn-primary"
                    onClick={() => {
                      const input = document.getElementById('customQuantity');
                      const quantity = parseInt(input.value) || 0;
                      if (quantity > 0) {
                        quickAddStock(stockModalProduct.id, quantity);
                        setShowStockModal(false);
                      }
                    }}
                  >
                    Aplicar Quantidade
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}