import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./screens/Home";
import Products from "./screens/Products";
import Sales from "./screens/Sales";
import Reports from "./screens/Reports";
import Login from "./screens/Login";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <header className="header">
            <h1>Sistema Estoque & Caixa</h1>
            <nav>
              {/* Removido "Perfil" - agora está na Home */}
              <Link to="/">Home</Link>
              <Link to="/products">Estoque</Link>
              <Link to="/sales">Caixa</Link>
              <Link to="/reports">Relatórios</Link>
            </nav>
          </header>

          <main className="main">
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* Removida a rota /profile */}

              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <Sales />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}