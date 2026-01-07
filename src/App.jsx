import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./screens/Home";
import Products from "./screens/Products";
import Sales from "./screens/Sales";
import Reports from "./screens/Reports";
import Login from "./screens/Login";
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProductsProvider } from "./context/ProductsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { initDefaultProducts } from "./services/storage";
import "./App.css";

function AppContent() {
  const { user, loading } = useAuth();
  const [productsInitialized, setProductsInitialized] = useState(false);

  // Inicializar produtos padrão apenas uma vez
  useEffect(() => {
    if (!productsInitialized) {
      try {
        initDefaultProducts();
        setProductsInitialized(true);
      } catch (error) {
        console.error("Erro ao inicializar produtos:", error);
      }
    }
  }, [productsInitialized]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando sistema...</p>
      </div>
    );
  }

  return (
    <ProductsProvider>
      <BrowserRouter>
        <div className="app">
          {/* Header - só mostra se estiver logado */}
          {user && (
            <header className="header">
              <div className="header-container">
                <div className="header-left">
                  <h1>Sistema Estoque & Caixa</h1>
                </div>
                
                <nav className="header-nav">
                  <Link to="/" className="nav-link">
                    <span className="nav-icon">🏠</span> Home
                  </Link>
                  <Link to="/products" className="nav-link">
                    <span className="nav-icon">📦</span> Estoque
                  </Link>
                  <Link to="/sales" className="nav-link">
                    <span className="nav-icon">💰</span> Caixa
                  </Link>
                  <Link to="/reports" className="nav-link">
                    <span className="nav-icon">📊</span> Relatórios
                  </Link>
                </nav>
              </div>
            </header>
          )}

          {/* Main Content */}
          <main className="main">
            <Routes>
              {/* Redireciona raiz baseado no login */}
              <Route path="/" element={
                user ? <Navigate to="/home" /> : <Navigate to="/login" />
              } />
              
              <Route path="/login" element={
                user ? <Navigate to="/home" /> : <Login />
              } />
              
              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              
              <Route path="/products" element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              
              {/* Página 404 */}
              <Route path="*" element={
                <ProtectedRoute>
                  <div className="not-found-container">
                    <h1>404 - Página não encontrada</h1>
                    <Link to="/home" className="button">Voltar para Home</Link>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </main>

          {/* Footer - só mostra se estiver logado */}
          {user && (
            <footer className="footer">
              <p>Sistema Estoque & Caixa © {new Date().getFullYear()}</p>
            </footer>
          )}
        </div>
      </BrowserRouter>
    </ProductsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
