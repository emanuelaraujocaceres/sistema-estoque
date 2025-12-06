import { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, initDefaultProducts } from "../services/storage";
import "./Products.css"; // Importe um CSS específico

function emptyForm() { 
  return { 
    id: null, 
    sku: "", 
    name: "", 
    price: "", 
    cost: "", 
    unit: "un", 
    stock: "", 
    min_stock: "" 
  }; 
}

export default function Products() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    initDefaultProducts();
    setList(getProducts());
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, 
      [name]: value
    }));
  }

  function handleAdd() {
    if (!form.name.trim()) return alert("Informe o nome do produto");
    if (!form.price || Number(form.price) <= 0) return alert("O preço deve ser maior que zero");

    const prod = { 
      ...form, 
      id: Date.now(),
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0
    };
    
    addProduct(prod);
    setList(getProducts());
    setForm(emptyForm());
  }

  function handleEdit(p) {
    setForm({
      ...p,
      price: p.price.toString(),
      cost: p.cost.toString(),
      stock: p.stock.toString(),
      min_stock: p.min_stock.toString()
    });
    setEditing(true);
  }

  function handleSaveEdit() {
    if (!form.name.trim()) return alert("Informe o nome do produto");
    if (!form.price || Number(form.price) <= 0) return alert("O preço deve ser maior que zero");

    const updatedProduct = {
      ...form,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0
    };
    
    updateProduct(form.id, updatedProduct);
    setList(getProducts());
    setForm(emptyForm());
    setEditing(false);
  }

  function handleCancel() {
    setForm(emptyForm());
    setEditing(false);
  }

  function handleDelete(id, name) {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;
    deleteProduct(id);
    setList(getProducts());
  }

  return (
    <div className="products-container">
      {/* FORM */}
      <div className="card form-card">
        <h3 className="form-title">
          {editing ? "✏️ Editar Produto" : "➕ Adicionar Produto"}
        </h3>

        <div className="form-group">
          <label>Nome do Produto *</label>
          <input
            className="input"
            name="name"
            placeholder="Ex: Café Premium 500g"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-col">
            <label>Preço de Venda (R$) *</label>
            <input 
              className="input" 
              type="number" 
              name="price" 
              min="0" 
              step="0.01"
              placeholder="0,00"
              value={form.price} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-col">
            <label>Custo (R$)</label>
            <input 
              className="input" 
              type="number" 
              name="cost" 
              min="0" 
              step="0.01"
              placeholder="0,00"
              value={form.cost} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-col">
            <label>Unidade</label>
            <select className="input" name="unit" value={form.unit} onChange={handleChange}>
              <option value="un">Unidade (un)</option>
              <option value="kg">Quilo (kg)</option>
              <option value="g">Grama (g)</option>
              <option value="lt">Litro (lt)</option>
              <option value="ml">Mililitro (ml)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="pct">Pacote (pct)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-col">
            <label>Estoque Atual</label>
            <input 
              className="input" 
              type="number" 
              name="stock" 
              min="0"
              placeholder="0"
              value={form.stock} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-col">
            <label>Estoque Mínimo</label>
            <input 
              className="input" 
              type="number" 
              name="min_stock" 
              min="0"
              placeholder="0"
              value={form.min_stock} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-col">
            <label>Código (SKU)</label>
            <input 
              className="input" 
              name="sku" 
              placeholder="Código do produto"
              value={form.sku} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div className="form-actions">
          {editing ? (
            <>
              <button className="button btn-primary" onClick={handleSaveEdit}>💾 Salvar</button>
              <button className="button btn-secondary" onClick={handleCancel}>
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button className="button btn-primary" onClick={handleAdd}>➕ Adicionar Produto</button>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div className="card list-card">
        <h3 className="list-title">
          📦 Produtos Cadastrados ({list.length})
        </h3>

        {list.length === 0 ? (
          <div className="empty-state">
            Nenhum produto cadastrado. Adicione seu primeiro produto!
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Unidade</th>
                  <th className="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td className="product-cell">
                      <strong>{p.name}</strong>
                      {p.sku && <div className="sku-text">SKU: {p.sku}</div>}
                    </td>
                    <td className="price-cell">R$ {Number(p.price).toFixed(2)}</td>
                    <td className="stock-cell">
                      <span className={`stock-badge ${p.stock <= p.min_stock ? 'stock-low' : 'stock-ok'}`}>
                        {p.stock} {p.unit}
                      </span>
                      {p.min_stock > 0 && <div className="min-stock">Mín: {p.min_stock}</div>}
                    </td>
                    <td className="unit-cell">{p.unit}</td>
                    <td className="actions-cell">
                      <div className="actions-buttons">
                        <button className="button btn-edit" onClick={() => handleEdit(p)}>Editar</button>
                        <button className="button btn-danger" onClick={() => handleDelete(p.id, p.name)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}