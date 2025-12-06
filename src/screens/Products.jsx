import { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, initDefaultProducts } from "../services/storage";

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
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* FORM */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#2d3748" }}>
          {editing ? "✏️ Editar Produto" : "➕ Adicionar Produto"}
        </h3>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: "5px" }}>Nome do Produto *</label>
          <input
            className="input"
            name="name"
            placeholder="Ex: Café Premium 500g"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="row" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Preço de Venda (R$) *</label>
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

          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Custo (R$)</label>
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

          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Unidade</label>
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

        <div className="row" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Estoque Atual</label>
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

          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Estoque Mínimo</label>
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

          <div className="col" style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Código (SKU)</label>
            <input 
              className="input" 
              name="sku" 
              placeholder="Código do produto"
              value={form.sku} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {editing ? (
            <>
              <button className="button btn-primary" onClick={handleSaveEdit}>💾 Salvar</button>
              <button className="button" onClick={handleCancel} style={{ background: "#718096", color: "#fff" }}>
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button className="button btn-primary" onClick={handleAdd}>➕ Adicionar Produto</button>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#2d3748" }}>
          📦 Produtos Cadastrados ({list.length})
        </h3>

        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Nenhum produto cadastrado. Adicione seu primeiro produto!
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", minWidth: "600px", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Unidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.sku && <div className="small">SKU: {p.sku}</div>}
                    </td>
                    <td>R$ {Number(p.price).toFixed(2)}</td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: p.stock <= p.min_stock ? "#fed7d7" : "#c6f6d5",
                        color: p.stock <= p.min_stock ? "#9b2c2c" : "#276749",
                        fontWeight: 500,
                        display: "inline-block"
                      }}>
                        {p.stock} {p.unit}
                      </span>
                      {p.min_stock > 0 && <div className="small">Mín: {p.min_stock}</div>}
                    </td>
                    <td>{p.unit}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="button" onClick={() => handleEdit(p)} style={{ background: "#4299e1", color: "white" }}>Editar</button>
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