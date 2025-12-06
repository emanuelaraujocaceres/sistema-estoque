// useStock.js - Hook para estoque
import { useProducts } from '../context/ProductsContext';

export const useStock = () => {
  const { products, updateStock, incrementStock } = useProducts();

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

  // Adicionar estoque a um produto
  const addStock = (productId, quantity = 1) => {
    if (quantity <= 0) return false;
    incrementStock(productId, quantity);
    return true;
  };

  // Adicionar produto mesmo com estoque zero
  const addProductWithZeroStock = (productData) => {
    // Esta função seria implementada no ProductsContext
    // Aqui é apenas um exemplo de interface
    console.log('Adding product with zero stock:', productData);
    return true;
  };

  // Verificar se pode adicionar ao carrinho
  const canAddToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    return product && product.estoque > 0;
  };

  // Obter produtos com estoque baixo
  const getLowStockProducts = () => {
    return products.filter(p => p.estoque <= (p.minEstoque || 3));
  };

  // Obter produtos sem estoque
  const getOutOfStockProducts = () => {
    return products.filter(p => p.estoque <= 0);
  };

  // Calcular valor total do estoque
  const getTotalStockValue = () => {
    return products.reduce((total, product) => {
      return total + (product.estoque * (product.preco || 0));
    }, 0);
  };

  return { 
    products, 
    addToCart, 
    updateStock,
    incrementStock: addStock,
    addStock,
    addProductWithZeroStock,
    canAddToCart,
    getLowStockProducts,
    getOutOfStockProducts,
    getTotalStockValue
  };
};