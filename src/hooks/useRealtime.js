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
                  .join('&') : undefined
            },
            (payload) => {
              if (options.onChange) {
                options.onChange(payload, setData);
              } else {
                // Atualização padrão
                if (payload.eventType === 'INSERT') {
                  setData(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                  setData(prev => 
                    prev.map(item => 
                      item.id === payload.new.id ? payload.new : item
                    )
                  );
                } else if (payload.eventType === 'DELETE') {
                  setData(prev => 
                    prev.filter(item => item.id !== payload.old.id)
                  );
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Conectado ao canal ${table} em tempo real`);
            }
          });
          
      } catch (err) {
        console.error('Erro no tempo real:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, supabase, table, JSON.stringify(options)]);

  return { data, loading, error, setData };
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