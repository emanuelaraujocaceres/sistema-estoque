import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

// Hook principal para tempo real
export function useRealtime(table, options = {}) {
  const { user, supabase } = useAuth();
  const [data, setData] = useState(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !supabase) return;

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
        
        // Configurar subscrição em tempo real
        channel = supabase
          .channel(`${table}-realtime-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: options.events || '*',
              schema: 'public',
              table: table,
              filter: options.filter ? 
                Object.entries(options.filter)
                  .map(([key, value]) => `${key}=eq.${value}`)
                  .join(',') : undefined
            },
            (payload) => {
              console.log('🔄 Evento recebido:', payload);
              setData(prev => [...prev, payload.new]);
            }
          );

        await channel.subscribe();
      } catch (err) {
        console.error('❌ Erro no setupRealtime:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log('🔌 Desconectando do canal realtime...');
        channel.unsubscribe();
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