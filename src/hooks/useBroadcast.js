import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';

export function useBroadcast() {
  const { user, supabase } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  // Conectar ao canal quando o usuário logar
  useEffect(() => {
    if (!user || !supabase) return;

    console.log('🟡 Conectando ao canal de broadcast...');
    
    // Canal específico para este usuário
    const channel = supabase.channel(`user-${user.id}`, {
      config: {
        broadcast: { self: true } // Permite receber suas próprias mensagens
      }
    });

    // Quando receber uma mensagem
    channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      console.log('📨 Mensagem recebida:', payload);
      setMessages(prev => [...prev, payload]);
      
      // Executar ações baseadas no tipo
      handleIncomingMessage(payload);
    });

    // Monitorar status da conexão
    channel.subscribe((status) => {
      console.log('🔌 Status do broadcast:', status);
      setIsConnected(status === 'SUBSCRIBED');
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Conectado ao broadcast!');
        // Enviar mensagem de teste
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            type: 'connection',
            message: 'Dispositivo conectado',
            userId: user.id,
            device: navigator.userAgent.substring(0, 50),
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    // Limpar quando desmontar
    return () => {
      console.log('🔌 Desconectando do canal de broadcast...');
      channel.unsubscribe();
    };
  }, [user, supabase]);

  // Função para lidar com mensagens recebidas
  const handleIncomingMessage = useCallback((payload) => {
    console.log('🔄 Processando mensagem:', payload.type);
    
    switch (payload.type) {
      case 'profile_update':
        console.log('🔄 Atualização de perfil recebida');
        // Mostrar notificação
        if (payload.data.action === 'name_updated') {
          showNotification(`📱 Outro dispositivo atualizou o nome para: ${payload.data.name}`);
          // Recarrega após 1 segundo para pegar novo nome
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (payload.data.action === 'avatar_updated') {
          showNotification('📱 Outro dispositivo atualizou a foto de perfil');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (payload.data.action === 'email_updated') {
          showNotification('📱 Outro dispositivo atualizou o e-mail');
        }
        break;
        
      case 'connection':
        console.log(`📱 Dispositivo conectado: ${payload.device}`);
        showNotification(`📱 ${payload.device} conectado`);
        break;
        
      case 'logout':
        console.log('🔒 Logout solicitado de outro dispositivo');
        showNotification('🔒 Sessão encerrada em outro dispositivo');
        // Faz logout local
        setTimeout(() => {
          supabase.auth.signOut();
          window.location.href = '/login';
        }, 2000);
        break;
        
      default:
        console.log('📨 Mensagem não reconhecida:', payload.type);
    }
  }, [supabase]);

  // Função para mostrar notificações
  const showNotification = (message) => {
    // Tenta usar a API de notificações do navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sistema Estoque', {
        body: message,
        icon: '/icon-72x72.png'
      });
    } else {
      // Fallback: alerta simples
      alert(`💬 ${message}`);
    }
  };

  // Função para enviar mensagens
  const sendMessage = useCallback((type, data) => {
    if (!user || !supabase) {
      console.warn('⚠️ Usuário não autenticado');
      return;
    }

    const channel = supabase.channel(`user-${user.id}`);
    
    const payload = {
      type,
      data,
      userId: user.id,
      timestamp: new Date().toISOString(),
      device: navigator.userAgent.substring(0, 50)
    };

    console.log('📤 Enviando mensagem:', payload);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload
        });
      }
    });
  }, [user, supabase]);

  return {
    isConnected,
    messages,
    sendMessage,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
    showNotification
  };
}