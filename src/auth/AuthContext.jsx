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

  const signIn = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('products_app_data');
    localStorage.removeItem('sales_app_data');
    localStorage.removeItem('user_avatar');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
