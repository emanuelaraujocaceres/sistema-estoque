import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./screens/Home";
import Products from "./screens/Products";
import Sales from "./screens/Sales";
import Reports from "./screens/Reports";
import Login from "./screens/Login";
import { AuthProvider } from "./auth/AuthContext";
import { ProductsProvider } from "./context/ProductsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { initDefaultProducts } from "./services/storage";
import "./App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Inicializar produtos padrão
  useEffect(() => {
    try {
      initDefaultProducts();
    } catch (error) {
      console.error("Erro ao inicializar produtos:", error);
    }
  }, []);

  

  return (
    <ProductsProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app">
            {/* Header */}
            <header className="header">
              <div className="header-container">
                <div className="header-left">
                  <button 
                    className="menu-toggle" 
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                  >
                    {menuOpen ? '✕' : '☰'}
                  </button>
                  <h1>Sistema Estoque & Caixa</h1>
                </div>
                
                <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
                  <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                    <span className="nav-icon">🏠</span> Home
                  </Link>
                  <Link to="/products" className="nav-link" onClick={() => setMenuOpen(false)}>
                    <span className="nav-icon">📦</span> Estoque
                  </Link>
                  <Link to="/sales" className="nav-link" onClick={() => setMenuOpen(false)}>
                    <span className="nav-icon">💰</span> Caixa
                  </Link>
                  <Link to="/reports" className="nav-link" onClick={() => setMenuOpen(false)}>
                    <span className="nav-icon">📊</span> Relatórios
                  </Link>
                  
                  <div className="nav-divider"></div>
                  
                  
                </nav>
              </div>
            </header>

            {/* Ferramentas de Desenvolvimento */}
            

            {/* Main Content */}
            <main className="main">
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={
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
                      <div className="not-found-card">
                        <div className="not-found-icon">❌</div>
                        <h2>404 - Página não encontrada</h2>
                        <p>A página que você está procurando não existe ou foi movida.</p>
                        <div className="not-found-actions">
                          <Link to="/" className="button btn-primary" onClick={() => setMenuOpen(false)}>
                            🏠 Voltar para Home
                          </Link>
                          <button 
                            className="button btn-secondary" 
                            onClick={() => window.history.back()}
                          >
                            ↩️ Voltar
                          </button>
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="footer">
              <div className="footer-content">
                <p>Sistema Estoque & Caixa © {new Date().getFullYear()} - Todos os direitos reservados</p>
                <p className="footer-version">Versão 2.0.0 | Desenvolvido com React + Vite</p>
                <div className="footer-links">
                  <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); alert('Em breve!'); }}>
                    📖 Documentação
                  </a>
                  <span className="footer-separator">•</span>
                  <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); alert('Contato: suporte@estoqueapp.com'); }}>
                    📧 Suporte
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ProductsProvider>
  );
}