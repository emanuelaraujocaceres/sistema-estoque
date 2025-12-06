import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  return useContext(ProductsContext);
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('products');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, nome: 'CafÃ©', codigo: 'CAFE001', preco: 50, estoque: 4, minEstoque: 3 },
      { id: 2, nome: 'Gasolina', codigo: 'GAS001', preco: 100, estoque: 0, minEstoque: 10 },
      { id: 3, nome: 'Cerveja Heineken', codigo: 'CERVEJA001', preco: 20, estoque: 10, minEstoque: 5 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  const updateStock = (id, change) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, estoque: Math.max(0, p.estoque + change) } : p
    ));
  };

  return (
    <ProductsContext.Provider value={{ products, updateStock }}>
      {children}
    </ProductsContext.Provider>
  );
};
