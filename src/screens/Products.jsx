import { useEffect, useState } from "react";
import { getProducts, saveProducts, addProduct, updateProduct, deleteProduct } from "../services/storage";

function emptyForm() { 
  return { 
    id: null, 
    sku: "", 
    name: "", 
    price: 0, 
    cost: 0, 
    unit: "un", 
    stock: 0, 
    min_stock: 0 
  }; 
}

export default function Products() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setList(getProducts());
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, 
      [name]: name === "price" || name === "cost" || name === "stock" || name === "min_stock" 
        ? Number(value) 
        : value 
    }));
  }

  function handleAdd() {
    if (!form.name.trim()) {
      alert("Informe o nome do produto");
      return;
    }
    if (form.price <= 0) {
      alert("O preço deve ser maior que zero");
      return;
    }
    
    const prod = { ...form, id: Date.now() };
    addProduct(prod);
    setList(getProducts());
    setForm(emptyForm());
  }

  function handleEdit(p) {
    setForm(p);
    setEditing(true);
  }

  function handleSaveEdit() {
    updateProduct(form.id, form);
    setList(getProducts());
    setForm(emptyForm());
    setEditing(false);
  }

  function handleCancel() {
    setForm(emptyForm());
    setEditing(false);
  }

  function handleDelete(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;
    deleteProduct(id);
    setList(getProducts());
  }

  return (
    <div>
      {/* Card do Formulário */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#2d3748" }}>
          {editing ? "✏️ Editar Produto" : "➕ Adicionar Produto"}
        </h3>
        
        <div style={{ marginBottom: "15px" }}>
          <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
            Nome do Produto *
          </div>
          <input
            className="input"
            name="name"
            placeholder="Ex: Café Premium 500g"
            value={form.name}
            onChange={handleChange}
            style={{ marginBottom: "15px" }}
          />
        </div>

        <div className="row" style={{ marginBottom: "15px" }}>
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Preço de Venda (R$) *
            </div>
            <input
              className="input"
              type="number"
              name="price"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
            />
          </div>
          
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Custo (R$)
            </div>
            <input
              className="input"
              type="number"
              name="cost"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={handleChange}
            />
          </div>
          
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Unidade
            </div>
            <select
              className="input"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              style={{ padding: "10px" }}
            >
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

        <div className="row" style={{ marginBottom: "20px" }}>
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Estoque Atual
            </div>
            <input
              className="input"
              type="number"
              name="stock"
              placeholder="0"
              min="0"
              value={form.stock}
              onChange={handleChange}
            />
          </div>
          
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Estoque Mínimo
            </div>
            <input
              className="input"
              type="number"
              name="min_stock"
              placeholder="0"
              min="0"
              value={form.min_stock}
              onChange={handleChange}
            />
          </div>
          
          <div className="col">
            <div style={{ marginBottom: "8px", fontWeight: "500", color: "#333", fontSize: "14px" }}>
              Código (SKU)
            </div>
            <input
              className="input"
              name="sku"
              placeholder="Ex: CAF001"
              value={form.sku}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {editing ? (
            <>
              <button className="button btn-primary" onClick={handleSaveEdit} style={{ padding: "10px 20px" }}>
                💾 Salvar Alterações
              </button>
              <button className="button" onClick={handleCancel} style={{ padding: "10px 20px", background: "#718096", color: "white" }}>
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button className="button btn-primary" onClick={handleAdd} style={{ padding: "10px 20px" }}>
              ➕ Adicionar Produto
            </button>
          )}
        </div>
      </div>

      {/* Card da Lista de Produtos */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#2d3748" }}>
          📦 Produtos Cadastrados ({list.length})
        </h3>
        
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Nenhum produto cadastrado. Adicione seu primeiro produto!
          </div>
        ) : (
          <table className="table" style={{ fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px", background: "#f8f9fa" }}>Produto</th>
                <th style={{ padding: "12px", background: "#f8f9fa" }}>Preço</th>
                <th style={{ padding: "12px", background: "#f8f9fa" }}>Estoque</th>
                <th style={{ padding: "12px", background: "#f8f9fa" }}>Unidade</th>
                <th style={{ padding: "12px", background: "#f8f9fa" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: "500" }}>{p.name}</div>
                    {p.sku && <div className="small">SKU: {p.sku}</div>}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "500" }}>
                    R$ {Number(p.price).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: p.stock <= (p.min_stock || 0) ? "#fed7d7" : "#c6f6d5",
                      color: p.stock <= (p.min_stock || 0) ? "#9b2c2c" : "#276749",
                      fontWeight: "500"
                    }}>
                      {p.stock} {p.unit}
                    </span>
                    {p.min_stock > 0 && (
                      <div className="small" style={{ marginTop: "4px" }}>
                        Mín: {p.min_stock}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px" }}>{p.unit}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button 
                        className="button" 
                        onClick={() => handleEdit(p)}
                        style={{ padding: "6px 12px", fontSize: "13px" }}
                      >
                        Editar
                      </button>
                      <button 
                        className="button btn-danger" 
                        onClick={() => handleDelete(p.id, p.name)}
                        style={{ padding: "6px 12px", fontSize: "13px" }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}