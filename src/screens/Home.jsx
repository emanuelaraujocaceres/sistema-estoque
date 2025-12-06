// src/screens/Home.jsx
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Home.css"; // Vamos criar um CSS para a Home

export default function Home() {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [loadingName, setLoadingName] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  async function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair da conta?")) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  }

  async function saveName(e) {
    e?.preventDefault();
    setLoadingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) throw error;
      alert("Nome atualizado com sucesso.");
      setEditingName(false);
    } catch (err) {
      alert("Erro ao atualizar nome: " + (err.message || err));
    } finally {
      setLoadingName(false);
    }
  }

  async function saveEmail(e) {
    e?.preventDefault();
    if (!newEmail) return alert("Informe um e-mail válido.");
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      alert("E-mail atualizado. Verifique seu e-mail para confirmar (se aplicável).");
      setEditingEmail(false);
    } catch (err) {
      alert("Erro ao atualizar e-mail: " + (err.message || err));
    } finally {
      setLoadingEmail(false);
    }
  }

  async function savePassword(e) {
    e?.preventDefault();
    if (!newPassword || newPassword.length < 6) return alert("Senha precisa ter ao menos 6 caracteres.");
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Senha alterada com sucesso.");
      setEditingPassword(false);
      setNewPassword("");
    } catch (err) {
      alert("Erro ao alterar senha: " + (err.message || err));
    } finally {
      setLoadingPassword(false);
    }
  }

  const displayName = user?.user_metadata?.name || user?.email || "Usuário";

  return (
    <div className="home-container">
      {/* Cabeçalho com boas-vindas e botão de sair */}
      <div className="home-header">
        <div>
          <h1>Dashboard</h1>
          <p className="welcome-text">Bem-vindo, {displayName}!</p>
        </div>
        <button 
          className="logout-button"
          onClick={handleLogout}
        >
          🚪 Sair da Conta
        </button>
      </div>

      {/* Card do Perfil */}
      <div className="card profile-card">
        <h2>📋 Perfil</h2>
        <div className="profile-info">
          <div className="profile-main">
            <div className="profile-name">{displayName}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        <div className="profile-details">
          <h4>📄 Informações</h4>
          <div className="detail-item"><strong>Nome:</strong> {user?.user_metadata?.name || "—"}</div>
          <div className="detail-item"><strong>E-mail:</strong> {user?.email}</div>
          <div className="detail-item"><strong>ID:</strong> <span className="user-id">{user?.id?.substring(0, 8)}...</span></div>
        </div>

        <div className="profile-actions">
          <button className="button btn-action" onClick={() => setEditingName(true)}>
            ✏️ Alterar nome
          </button>
          <button className="button btn-action" onClick={() => setEditingEmail(true)}>
            📧 Alterar e-mail
          </button>
          <button className="button btn-action" onClick={() => setEditingPassword(true)}>
            🔒 Alterar senha
          </button>
        </div>
      </div>

      {/* Modal Alterar Nome */}
      {editingName && (
        <div className="card modal-card">
          <h3>✏️ Alterar nome</h3>
          <form onSubmit={saveName}>
            <input 
              className="input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Nome da empresa ou usuário" 
            />
            <div className="modal-actions">
              <button className="button btn-primary" disabled={loadingName}>
                {loadingName ? "Salvando..." : "💾 Salvar"}
              </button>
              <button 
                className="button btn-secondary" 
                type="button" 
                onClick={() => setEditingName(false)}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Alterar E-mail */}
      {editingEmail && (
        <div className="card modal-card">
          <h3>📧 Alterar e-mail</h3>
          <form onSubmit={saveEmail}>
            <input 
              className="input" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              placeholder="Novo e-mail" 
            />
            <div className="modal-actions">
              <button className="button btn-primary" disabled={loadingEmail}>
                {loadingEmail ? "Enviando..." : "📤 Atualizar e-mail"}
              </button>
              <button 
                className="button btn-secondary" 
                type="button" 
                onClick={() => setEditingEmail(false)}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
          <p className="modal-note">
            Você pode precisar confirmar esse novo e-mail via link enviado.
          </p>
        </div>
      )}

      {/* Modal Alterar Senha */}
      {editingPassword && (
        <div className="card modal-card">
          <h3>🔒 Alterar senha</h3>
          <form onSubmit={savePassword}>
            <input 
              className="input" 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Nova senha (mínimo 6 caracteres)" 
            />
            <div className="modal-actions">
              <button className="button btn-primary" disabled={loadingPassword}>
                {loadingPassword ? "Alterando..." : "🔑 Alterar senha"}
              </button>
              <button 
                className="button btn-secondary" 
                type="button" 
                onClick={() => setEditingPassword(false)}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Você pode adicionar mais cards de dashboard aqui futuramente */}
    </div>
  );
}