import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useBroadcast } from '../hooks/useBroadcast';

// Hook para sincronizar estado entre dispositivos
export function useSyncState(key, initialValue) {
  const { user } = useAuth();
  const { sendMessage } = useBroadcast();
  const [value, setValue] = useState(() => {
    // Tenta carregar do localStorage
    if (!user) return initialValue;
    const saved = localStorage.getItem(`${key}_${user.id}`);
    return saved ? JSON.parse(saved) : initialValue;
  });

  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`${key}_${user.id}`, JSON.stringify(value));
  }, [value, key, user]);

  // Função que atualiza e sincroniza
  const syncValue = (newValue) => {
    setValue(newValue);
    
    // Enviar para outros dispositivos
    if (user) {
      sendMessage('state_sync', {
        key,
        value: newValue,
        action: 'update'
      });
    }
  };

  return [value, syncValue];
}

// Hook para sincronizar objetos complexos
export function useSyncObject(key, initialValue = {}) {
  const { user } = useAuth();
  const { sendMessage } = useBroadcast();
  const [object, setObject] = useState(() => {
    if (!user) return initialValue;
    const saved = localStorage.getItem(`${key}_obj_${user.id}`);
    return saved ? JSON.parse(saved) : initialValue;
  });

  // Salvar no localStorage
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`${key}_obj_${user.id}`, JSON.stringify(object));
  }, [object, key, user]);

  // Atualizar propriedade específica
  const updateProperty = (property, value) => {
    const updated = { ...object, [property]: value };
    setObject(updated);
    
    // Sincronizar
    if (user) {
      sendMessage('object_sync', {
        key,
        property,
        value,
        action: 'update_property'
      });
    }
  };

  return [object, updateProperty, setObject];
}