// src/components/AppStatus.jsx
import React from 'react';
import { useAuth } from '../auth/AuthContext';

export const AppStatus = () => {
  const { user, loading, error } = useAuth();
  
  if (loading) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: error ? '#f8d7da' : '#d4edda',
      color: error ? '#721c24' : '#155724',
      padding: '10px 15px',
      borderRadius: '5px',
      fontSize: '14px',
      zIndex: 9999,
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: error ? '#dc3545' : '#28a745',
        animation: error ? 'pulse 1s infinite' : 'none'
      }}></div>
      
      <div>
        {error ? (
          <><strong>⚠️ Erro:</strong> {error}</>
        ) : (
          <><strong>✅ Sistema:</strong> {user ? 'Usuário autenticado' : 'Pronto para login'}</>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
