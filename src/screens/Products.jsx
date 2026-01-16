import { useEffect, useState } from "react";
import { useProducts } from "../context/ProductsContext";
import "./Products.css";

export default function Products() {
  const [list, setList] = useState([]);
  const { products: ctxProducts } = useProducts();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="products-container">
      <h1>Produtos</h1>
      {loading ? <p>Carregando...</p> : <ul>{list.map(product => <li key={product.id}>{product.name}</li>)}</ul>}
    </div>
  );
}