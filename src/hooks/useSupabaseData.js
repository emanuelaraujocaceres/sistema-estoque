// src/hooks/useSupabaseData.js
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase.ts';

export function useSupabaseData(table, options = {}) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar dados
  const fetchData = async () => {
    if (!user || !supabase) {
      setError('Usuário ou Supabase não disponível.');
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

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData(fetchedData || []);
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      setError(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados iniciais
  useEffect(() => {
    if (options.fetchOnMount !== false && user) {
      fetchData();
    }
  }, [user, table, options]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData // Para atualizações manuais
  };
}

// Hook específico para produtos
export function useProdutos(options = {}) {
  const { data: produtos, loading, error, refetch, setData } = 
    useSupabaseData('produtos', options);

  // Buscar produto por código
  const buscarPorCodigo = async (codigo) => {
    if (!codigo) return null;

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('codigo_barras', codigo)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar produto por código:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar produto por código:', error);
      return null;
    }
  };

  // Ajustar estoque
  const ajustarEstoque = async (produtoId, quantidade, motivo = '') => {
    try {
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) throw new Error('Produto não encontrado');

      const novaQuantidade = (produto.quantidade || 0) + quantidade;

      return await update(produtoId, {
        quantidade: novaQuantidade,
        ...(motivo && { ultimo_ajuste: motivo })
      });
    } catch (error) {
      console.error('❌ Erro ao ajustar estoque:', error);
      throw error;
    }
  };

  return {
    produtos,
    loading,
    error,
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
