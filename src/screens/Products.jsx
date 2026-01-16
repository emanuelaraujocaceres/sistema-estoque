import { useEffect, useState, useRef } from "react";
import { useProducts } from "../context/ProductsContext";
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
    image: "",
    saleType: "unit",
    pricePerKilo: ""
  }; 
}

export default function Products() {
  const [list, setList] = useState([]);
  const { products: ctxProducts, syncWithStorage } = useProducts();
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        setList(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from('products').update(form).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(form);
        if (error) throw error;
      }
      setForm(emptyForm());
      setEditing(false);
      const { data } = await supabase.from('products').select('*');
      setList(data);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="products-container">
      <h1>Gerenciar Produtos</h1>
      {/* Restante do código da interface */}
    </div>
  );
}