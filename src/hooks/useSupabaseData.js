// src/hooks/useSupabaseData.js - VERSÃO CORRIGIDA
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase'; // ✅ Importa diretamente da instância única

export function useSupabaseData(table, options = {}) {
  const { user } = useAuth(); // ✅ Apenas user, supabase vem de import direto
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar dados
  const fetchData = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from(table).select('*');
      
      // Filtro automático por usuário (exceto se desativado)
      if (options.ignoreUserFilter !== true) {
        query = query.eq('user_id', user.id);
      }
      
      // Filtros adicionais
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      
      // Ordenação
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending !== false
        });
      }
      
      // Limite
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data: fetchedData, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setData(fetchedData || []);
      
    } catch (err) {
      console.error(`Erro ao buscar ${table}:`, err);
      setError(err);
      setData([]); // Garante array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados iniciais
  useEffect(() => {
    if (options.fetchOnMount !== false && user) {
      fetchData();
    }
  }, [user, supabase, JSON.stringify(options.filters)]);

  // Operações CRUD
  const create = async (itemData) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const itemWithUser = {
        ...itemData,
        user_id: user.id,
        atualizado_em: new Date().toISOString()
      };
      
      // Remove id se for enviado (deixa o Supabase gerar)
      if (itemWithUser.id && itemWithUser.id.startsWith('temp-')) {
        delete itemWithUser.id;
      }
      
      const { data: newItem, error } = await supabase
        .from(table)
        .insert(itemWithUser)
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualizar estado local
      setData(prev => [...prev, newItem]);
      return newItem;
      
    } catch (err) {
      console.error(`Erro ao criar em ${table}:`, err);
      throw err;
    }
  };

  const update = async (id, updates) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const { data: updatedItem, error } = await supabase
        .from(table)
        .update({
          ...updates,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualizar estado local
      setData(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      return updatedItem;
      
    } catch (err) {
      console.error(`Erro ao atualizar em ${table}:`, err);
      throw err;
    }
  };

  const remove = async (id) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setData(prev => prev.filter(item => item.id !== id));
      
    } catch (err) {
      console.error(`Erro ao excluir de ${table}:`, err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refetch: fetchData,
    setData // Para atualizações manuais
  };
}

// Hook específico para produtos
export function useProdutos(options = {}) {
  const { data: produtos, loading, error, create, update, remove, refetch, setData } = 
    useSupabaseData('produtos', options);
  
  // Buscar produto por código
  const buscarPorCodigo = async (codigo) => {
    if (!codigo) return null;
    
    const { data, error } = await supabase // ✅ Agora supabase está definido
      .from('produtos')
      .select('*')
      .eq('codigo_barras', codigo)
      .single();
    
    if (error) return null;
    return data;
  };
  
  // Ajustar estoque
  const ajustarEstoque = async (produtoId, quantidade, motivo = '') => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) throw new Error('Produto não encontrado');
    
    const novaQuantidade = (produto.quantidade || 0) + quantidade;
    
    return await update(produtoId, {
      quantidade: novaQuantidade,
      ...(motivo && { ultimo_ajuste: motivo })
    });
  };
  
  return {
    produtos,
    loading,
    error,
    create,
    update,
    remove,
    refetch,
    setData,
    buscarPorCodigo,
    ajustarEstoque
  };
}

// Hook específico para vendas
export function useVendas(options = {}) {
  return useSupabaseData('vendas', options);
}

// Hook específico para clientes
export function useClientes(options = {}) {
  return useSupabaseData('clientes', options);
}