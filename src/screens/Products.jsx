import { useEffect, useState } from "react";
import { useProducts } from "../context/ProductsContext";
import { getSupabase } from "../lib/supabase";
import "./Products.css";

export default function Products() {
  const [list, setList] = useState([]);
  const { products: ctxProducts } = useProducts();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();

        // Verificar sessão antes de realizar a requisição
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`Erro de sessão: ${sessionError.message}`);
        if (!sessionData.session) throw new Error("Sessão expirada. Faça login novamente.");

        // Realizar a requisição
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;

        setList(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        alert(`Erro ao buscar produtos: ${error.message || "Erro desconhecido"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="products-container">
      <h1>Produtos</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul>
          {list.map((product) => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}