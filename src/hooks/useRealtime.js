import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

// Hook principal para tempo real
export function useRealtime(table, options = {}) {
  const { user, supabase } = useAuth();
  const [data, setData] = useState(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !supabase) {
      setError('Usuário ou Supabase não disponível.');
      setLoading(false);
      return;
    }

    let channel;

    const setupRealtime = async () => {
      try {
        // Carregar dados iniciais
        if (options.fetchInitial) {
          setLoading(true);
          let query = supabase.from(table).select('*');
          
          if (options.filter) {
            Object.keys(options.filter).forEach(key => {
              query = query.eq(key, options.filter[key]);
            });
          }
          
          if (options.orderBy) {
            query = query.order(options.orderBy.column, {
              ascending: options.orderBy.ascending !== false
            });
          }
          
          const { data: initialData, error: fetchError } = await query;
          
          if (fetchError) throw fetchError;
          setData(initialData || []);
        }
        
        // Configurar canal de tempo real
        channel = supabase.channel(`realtime-${table}`);

        channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          console.log('📡 Atualização em tempo real:', payload);
          setData(prev => [...prev, payload.new]);
        });

        channel.subscribe((status) => {
          console.log('🔌 Status do canal de tempo real:', status);
          if (status !== 'SUBSCRIBED') {
            throw new Error('Falha ao conectar ao canal de tempo real.');
          }
        });
      } catch (error) {
        console.error('❌ Erro ao configurar tempo real:', error);
        setError(error.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        channel.unsubscribe();
        console.log('🔴 Canal de tempo real desconectado.');
      }
    };
  }, [user, supabase, table, options]);

  return { data, loading, error };
}

// Hook para broadcast entre dispositivos
export function useUserBroadcast() {
  const { user, supabase } = useAuth();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`user-broadcast-${user.id}`);
    
    channel
      .on('broadcast', { event: 'user-action' }, ({ payload }) => {
        console.log('Broadcast recebido:', payload);
        setMessages(prev => [...prev, payload]);
        
        // Executar ação baseada no tipo
        switch (payload.type) {
          case 'profile_update':
            // Recarregar perfil
            window.location.reload();
            break;
          case 'data_update':
            // Atualizar dados específicos
            if (payload.onReceive) {
              payload.onReceive(payload.data);
            }
            break;
          default:
            console.log('Ação não reconhecida:', payload.type);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Função para enviar broadcast
  const sendBroadcast = (type, data, options = {}) => {
    if (!user) return;
    
    const channel = supabase.channel(`user-broadcast-${user.id}`);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'user-action',
          payload: {
            type,
            data,
            userId: user.id,
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...options
          }
        });
      }
    });
  };

  return { messages, sendBroadcast };
}