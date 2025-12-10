import React, { createContext, useState, useContext, useEffect } from 'react';
import { DEFAULT_PRODUCTS, STORAGE_KEY } from './productsConstants';
import { loadProductsFromSupabase, syncProductsToSupabase, setupRealtimeListeners } from '../services/supabaseSync';
import { supabase } from '../auth/supabaseClient';

const ProductsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => {
  return useContext(ProductsContext);
};

export const ProductsProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Monitorar mudanças de autenticação do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, 'User:', session?.user?.id);
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(product => ({
            id: product.id,
            name: product.name || product.nome || 'Produto sem nome',
            sku: product.sku || product.codigo || '',
            price: product.price || product.preco || 0,
            cost: product.cost || product.custo || 0,
            stock: product.stock || product.estoque || 0,
            min_stock: product.min_stock || product.minEstoque || 0,
            saleType: product.saleType || product.tipoVenda || 'unit',
            pricePerKilo: product.pricePerKilo || product.precoPorKilo || undefined,
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || new Date().toISOString()
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
    
    return DEFAULT_PRODUCTS;
  });

  const [realtimeSubscription, setRealtimeSubscription] = useState(null);

  // Sincronizar com localStorage (sem tentar usar user que pode não estar disponível)
  useEffect(() => {
    try {
      const productsToSave = products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        price: product.price || 0,
        cost: product.cost || 0,
        stock: product.stock || 0,
        min_stock: product.min_stock || 0,
        saleType: product.saleType || 'unit',
        pricePerKilo: product.saleType === 'weight' ? (product.pricePerKilo || product.price) : undefined,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || new Date().toISOString()
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(productsToSave));
    } catch (err) {
      console.error('Erro ao salvar produtos:', err);
    }
  }, [products]);

  // Sincronizar com Supabase quando usuário faz login e carregar produtos da nuvem
  useEffect(() => {
    if (user?.id) {
      // Carregar produtos do Supabase
      loadProductsFromSupabase(user.id).then(supabaseProducts => {
        if (supabaseProducts && Array.isArray(supabaseProducts) && supabaseProducts.length > 0) {
          console.log('📥 Carregando produtos do Supabase:', supabaseProducts.length);
          setProducts(supabaseProducts);
        }
      }).catch(err => {
        console.warn('Erro ao carregar produtos do Supabase (usando localStorage):', err);
      });

      // Setup realtime listeners para mudanças remotas
      const subscription = setupRealtimeListeners(user.id, () => {
        loadProductsFromSupabase(user.id).then(supabaseProducts => {
          if (supabaseProducts && Array.isArray(supabaseProducts)) {
            console.log('🔄 Produtos sincronizados do Supabase (mudança remota)');
            setProducts(supabaseProducts);
          }
        }).catch(err => {
          console.warn('Erro ao recarregar produtos após mudança remota:', err);
        });
      });

      setRealtimeSubscription(subscription);

      return () => {
        if (subscription) {
          supabase.removeChannel(subscription);
        }
      };
    }
  }, [user?.id]);

  // Sincronizar automaticamente quando houver mudanças externas
  useEffect(() => {
    const handleProductsUpdated = () => {
      try {
        const storageProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(storageProducts)) setProducts(storageProducts);
      } catch (err) {
        console.error('Erro ao sincronizar produtos via event:', err);
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === 'last_stock_update' || e.key === null) {
        handleProductsUpdated();
      }
    };

    window.addEventListener('products-updated', handleProductsUpdated);
    window.addEventListener('stock-updated', handleProductsUpdated);
    window.addEventListener('force-sync', handleProductsUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('products-updated', handleProductsUpdated);
      window.removeEventListener('stock-updated', handleProductsUpdated);
      window.removeEventListener('force-sync', handleProductsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Atualizar estoque de um produto
  const updateStock = (productId, quantityChange) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          const currentStock = product.stock || 0;
          const newStock = Math.max(0, currentStock + quantityChange);
          return { 
            ...product, 
            stock: newStock,
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
      name: productData.name || productData.nome || 'Novo Produto',
      sku: productData.sku || productData.codigo || '',
      price: parseFloat(productData.price) || 0,
      cost: parseFloat(productData.cost) || 0,
      stock: Math.max(0, parseInt(productData.stock) || 0),
      min_stock: Math.max(0, parseInt(productData.min_stock) || 0),
      saleType: productData.saleType || 'unit',
      pricePerKilo: productData.saleType === 'weight' ? (Number(productData.pricePerKilo) || Number(productData.price) || 0) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, newProduct]);
    console.log('➕ Produto adicionado:', newProduct.name, 'User:', user?.id);
    
    // Sincronizar com Supabase se user estiver logado
    if (user?.id) {
      const productsToSync = [...products, newProduct];
      console.log('📤 Sincronizando', productsToSync.length, 'produtos com Supabase...');
      syncProductsToSupabase(productsToSync, user.id)
        .then(result => {
          console.log('✅ Sincronização bem-sucedida:', result);
        })
        .catch(err => {
          console.error('❌ Erro ao sincronizar novo produto:', err);
        });
    } else {
      console.warn('⚠️ User não logado, produto salvo apenas localmente');
    }
    
    return newProduct;
  };

  // Atualizar produto existente
  const updateProduct = (productId, updatedData) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          return { 
            ...product, 
            name: updatedData.name || product.name,
            sku: updatedData.sku || product.sku,
            price: updatedData.saleType === 'weight' ? (Number(updatedData.pricePerKilo) || Number(updatedData.price) || product.price) : (parseFloat(updatedData.price) || product.price),
            cost: parseFloat(updatedData.cost) || product.cost,
            stock: Math.max(0, parseInt(updatedData.stock) || product.stock),
            min_stock: Math.max(0, parseInt(updatedData.min_stock) || product.min_stock),
            saleType: updatedData.saleType || product.saleType || 'unit',
            pricePerKilo: updatedData.saleType === 'weight' ? (Number(updatedData.pricePerKilo) || product.pricePerKilo) : undefined,
            updated_at: new Date().toISOString()
          };
        }
        return product;
      })
    );
    
    // Sincronizar com Supabase se user estiver logado
    if (user?.id) {
      syncProductsToSupabase(products, user.id).catch(err => {
        console.warn('Erro ao sincronizar atualização:', err);
      });
    }
  };

  // Deletar produto
  const deleteProduct = (productId) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    
    // Sincronizar com Supabase se user estiver logado
    if (user?.id) {
      const updatedProducts = products.filter(p => p.id !== productId);
      syncProductsToSupabase(updatedProducts, user.id).catch(err => {
        console.warn('Erro ao sincronizar deleção:', err);
      });
    }
  };

  // Obter produto por ID
  const getProduct = (id) => products.find(p => p.id === id);

  // Adicionar estoque em massa
  const addBulkStock = (stockUpdates) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const update = stockUpdates.find(u => u.productId === product.id);
        if (update) {
          const newStock = (product.stock || 0) + (update.quantity || 0);
          return { 
            ...product, 
            stock: Math.max(0, newStock),
            updated_at: new Date().toISOString()
          };
        }
        return product;
      })
    );
  };

  // Sincronizar com storage.js
  const syncWithStorage = () => {
    try {
      const storageProducts = JSON.parse(localStorage.getItem('products_app_data') || '[]');
      if (Array.isArray(storageProducts) && storageProducts.length > 0) {
        setProducts(storageProducts);
      }
    } catch (error) {
      console.error('Erro ao sincronizar com storage:', error);
    }
  };

  const value = {
    products,
    updateStock,
    incrementStock,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    addBulkStock,
    syncWithStorage
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};