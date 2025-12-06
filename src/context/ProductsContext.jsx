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
      { 
        id: 1, 
        nome: 'Café', 
        codigo: 'CAFE001', 
        preco: 50.00, 
        custo: 35.00,
        estoque: 4, 
        minEstoque: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 2, 
        nome: 'Gasolina', 
        codigo: 'GAS001', 
        preco: 100.00, 
        custo: 80.00,
        estoque: 0, 
        minEstoque: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 3, 
        nome: 'Cerveja Heineken 269ml', 
        codigo: 'CERVEJA001', 
        preco: 20.00, 
        custo: 15.00,
        estoque: 10, 
        minEstoque: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (e) {
      console.error('Erro ao salvar produtos:', e);
    }
  }, [products]);

  // Atualizar estoque de um produto
  const updateStock = (productId, quantityChange) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          const newStock = Math.max(0, product.estoque + quantityChange);
          return { 
            ...product, 
            estoque: newStock,
            updated_at: new Date().toISOString()
          };
        }
        return product;
      })
    );
  };

  // Incrementar estoque (botão rápido)
  const incrementStock = (productId, quantity = 1) => {
    return updateStock(productId, Math.abs(quantity));
  };

  // Adicionar novo produto (mesmo com estoque 0)
  const addProduct = (productData) => {
    const newProduct = {
      id: Date.now(),
      nome: productData.nome,
      codigo: productData.codigo || `PROD${Date.now()}`,
      preco: parseFloat(productData.preco) || 0,
      custo: parseFloat(productData.custo) || 0,
      estoque: Math.max(0, parseInt(productData.estoque) || 0),
      minEstoque: Math.max(0, parseInt(productData.minEstoque) || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  // Atualizar produto existente
  const updateProduct = (productId, updatedData) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          return { 
            ...product, 
            ...updatedData,
            updated_at: new Date().toISOString()
          };
        }
        return product;
      })
    );
  };

  // Deletar produto
  const deleteProduct = (productId) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
  };

  // Obter produto por ID
  const getProduct = (id) => products.find(p => p.id === id);

  // Adicionar estoque em massa
  const addBulkStock = (stockUpdates) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const update = stockUpdates.find(u => u.productId === product.id);
        if (update) {
          const newStock = product.estoque + (update.quantity || 0);
          return { 
            ...product, 
            estoque: Math.max(0, newStock),
            updated_at: new Date().toISOString()
          };
        }
        return product;
      })
    );
  };

  const value = {
    products,
    updateStock,
    incrementStock,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    addBulkStock
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};