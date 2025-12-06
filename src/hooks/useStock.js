// useStock.js - Hook para estoque
import { useProducts } from '../context/ProductsContext';

export const useStock = () => {
  const { products, updateStock } = useProducts();

  const addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product && product.estoque > 0) {
      // Diminui estoque
      updateStock(productId, -1);
      
      // Atualiza carrinho
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find(item => item.id === productId);
      
      if (existing) {
        existing.quantidade += 1;
      } else {
        cart.push({ ...product, quantidade: 1 });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      return true;
    }
    return false;
  };

  return { products, addToCart, updateStock };
};