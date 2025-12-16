import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        setUser(data.user);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    useEffect(() => {
        const session = supabase.auth.session();
        setUser(session?.user || null);
        setLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, 'User:', session?.user);
            setUser(session?.user || null);
        });

        return () => listener.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);