import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '../lib/supabase.ts'; // ✅ Importa diretamente

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔧 [AuthContext] Inicializando com supabase singleton')
    console.log('🔧 Instância ID:', supabase?.supabaseUrl?.substring(0, 30) || 'N/A')

    // Buscar sessão atual
    supabase.auth.getSession().then(({ data }) => {
      console.log('🔧 [AuthContext] Sessão inicial:', data?.session?.user?.email)

      if (data?.session?.user) {
        setUser(data.session.user);
      }
      setLoading(false);
    });

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔧 [AuthContext] Auth state changed:', _event, 'User:', session?.user?.email)

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        localStorage.removeItem('products_app_data');
        localStorage.removeItem('sales_app_data');
        localStorage.removeItem('user_avatar');
      }
      setLoading(false);
    });

    return () => {
      console.log('🔧 [AuthContext] Limpando subscription')
      subscription.unsubscribe()
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  // VALOR DO CONTEXTO - TUDO QUE SERÁ DISPONIBILIZADO
  const value = {
    user,
    loading,
    login,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// HOOK PERSONALIZADO para usar o AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

