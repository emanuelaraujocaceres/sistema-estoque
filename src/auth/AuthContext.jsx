import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '../lib/supabase'; // ✅ CORRETO: Importa da instância única
import { syncUserToSupabase, loadUserFromSupabase } from "../services/supabaseSync";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEBUG: Verificar instância
    console.log('🔧 [AuthContext] Usando instância Supabase singleton')
    
    // Buscar sessão atual
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
        // Sincronizar dados do usuário com Supabase
        syncUserToSupabase(data.session.user.id, {
          name: data.session.user.user_metadata?.name,
          email: data.session.user.email,
          avatar: data.session.user.user_metadata?.avatar,
        }).catch(err => console.warn('Erro ao sincronizar usuário ao carregar sessão:', err));
      }
      setLoading(false);
    });

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔧 [AuthContext] Auth state changed:', _event)
      
      if (session?.user) {
        setUser(session.user);
        // Sincronizar quando o usuário fizer login
        syncUserToSupabase(session.user.id, {
          name: session.user.user_metadata?.name,
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar,
        }).catch(err => console.warn('Erro ao sincronizar usuário:', err));
      } else {
        setUser(null);
        // Limpar localStorage ao fazer logout
        localStorage.removeItem('products_app_data');
        localStorage.removeItem('sales_app_data');
        localStorage.removeItem('user_avatar');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        // Sincronizar dados atualizados
        await syncUserToSupabase(data.user.id, {
          name: data.user.user_metadata?.name,
          email: data.user.email,
          avatar: data.user.user_metadata?.avatar,
        });
      }
      return data?.user || null;
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      return null;
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    
    setUser(data.user);
    // Sincronizar ao fazer login
    await syncUserToSupabase(data.user.id, {
      name: data.user.user_metadata?.name,
      email: data.user.email,
      avatar: data.user.user_metadata?.avatar,
    }).catch(err => console.warn('Erro ao sincronizar após login:', err));
    
    return data.user;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Limpar dados locais
    localStorage.removeItem('products_app_data');
    localStorage.removeItem('sales_app_data');
    localStorage.removeItem('user_avatar');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {/* ❌ REMOVIDO: supabase do value - NÃO é necessário! */}
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);