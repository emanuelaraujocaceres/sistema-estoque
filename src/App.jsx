import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./screens/Home";
import Products from "./screens/Products";
import Sales from "./screens/Sales";
import Reports from "./screens/Reports";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>Sistema Estoque & Caixa</h1>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/products">Estoque</Link>
            <Link to="/sales">Caixa</Link>
            <Link to="/reports">Relatórios</Link>
          </nav>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}