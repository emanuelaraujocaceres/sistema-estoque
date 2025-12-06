import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  return useContext(ProductsContext);
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('products');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    }
    
    return [
      { id: 1, nome: 'Café', codigo: 'CAFE001', preco: 50.00, estoque: 4, minEstoque: 3 },
      { id: 2, nome: 'Gasolina', codigo: 'GAS001', preco: 100.00, estoque: 0, minEstoque: 10 },
      { id: 3, nome: 'Cerveja Heineken 269ml', codigo: 'CERVEJA001', preco: 20.00, estoque: 10, minEstoque: 5 },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (e) {
      console.error('Erro ao salvar produtos:', e);
    }
  }, [products]);

  const updateStock = (productId, quantityChange) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          const newStock = Math.max(0, product.estoque + quantityChange);
          return { ...product, estoque: newStock };
        }
        return product;
      })
    );
  };

  const value = {
    products,
    updateStock,
    getProduct: (id) => products.find(p => p.id === id)
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};