// ?? BUILD FIX: 2026-01-07 10:24:21
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }){
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

