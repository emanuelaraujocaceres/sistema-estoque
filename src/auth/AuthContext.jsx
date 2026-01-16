import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '../lib/supabase.ts';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext mounted");
  }, []);

  useEffect(() => {
    console.log("User state updated in AuthContext:", user);
    console.log("Loading state updated in AuthContext:", loading);
  }, [user, loading]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Erro ao obter sessão do Supabase:", error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (data?.session?.user) {
        console.log("Sessão carregada:", data.session.user);
        setUser(data.session.user);
      } else {
        console.warn("Nenhuma sessão encontrada");
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

