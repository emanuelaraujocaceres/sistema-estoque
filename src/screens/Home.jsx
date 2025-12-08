import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Home.css";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Funções de logout
  async function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair da sua conta?")) {
      try {
        await supabase.auth.signOut();
        navigate("/login");
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
      }
    }
  }

  // Funções de atualização de perfil
  async function saveName(e) {
    e?.preventDefault();
    if (!name.trim()) {
      alert("Por favor, informe um nome válido.");
      return;
    }
    
    setLoadingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        data: { name: name.trim() } 
      });
      
      if (error) throw error;
      
      alert("✅ Nome atualizado com sucesso!");
      setEditingName(false);
    } catch (err) {
      console.error("Erro ao atualizar nome:", err);
      alert(`❌ Erro ao atualizar nome: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingName(false);
    }
  }

  async function saveEmail(e) {
    e?.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      alert("Por favor, informe um e-mail válido.");
      return;
    }
    
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      
      if (error) throw error;
      
      alert("✅ E-mail atualizado!\nVerifique sua caixa de entrada para confirmar o novo e-mail.");
      setEditingEmail(false);
    } catch (err) {
      console.error("Erro ao atualizar e-mail:", err);
      alert(`❌ Erro ao atualizar e-mail: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingEmail(false);
    }
  }

  async function savePassword(e) {
    e?.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) throw error;
      
      alert("✅ Senha alterada com sucesso!");
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      alert(`❌ Erro ao alterar senha: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoadingPassword(false);
    }
  }

  const displayName = user?.user_metadata?.name || user?.email || "Usuário";

  return (
    <div className="home-container">
      <div className="home-header">
        <div className="header-content">
          <div>
            <h1>Meu Perfil</h1>
            <p className="welcome-text">
              Olá, <span className="highlight">{displayName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="home-grid">
        {/* Perfil do Usuário */}
        <div className="card profile-card">
          <div className="card-header">
            <h2>👤 Perfil do Usuário</h2>
            <span className="badge">Ativo</span>
          </div>
          
          <div className="profile-info">
            <div className="avatar">
              {user?.user_metadata?.avatar ? (
                <img src={user.user_metadata.avatar} alt="Avatar" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="profile-details">
              <h3>{displayName}</h3>
              <p className="email">{user?.email}</p>
              <div className="profile-meta">
                <span className="meta-item">
                  <strong>ID:</strong> {user?.id?.substring(0, 8)}...
                </span>
                <span className="meta-item">
                  <strong>Último login:</strong> Hoje
                </span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <label className="button file-label">
              📷 Alterar Foto
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    alert('Selecione uma imagem válida');
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64 = reader.result;
                    try {
                      setUploadingAvatar(true);
                      const { error } = await supabase.auth.updateUser({ data: { avatar: base64 } });
                      if (error) throw error;
                      alert('✅ Foto de perfil atualizada. O app será recarregado.');
                      window.location.reload();
                    } catch (err) {
                      console.error('Erro ao atualizar avatar:', err);
                      alert('Erro ao atualizar foto de perfil');
                    } finally {
                      setUploadingAvatar(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button 
              className="button btn-action"
              onClick={() => setEditingName(true)}
            >
              ✏️ Alterar Nome
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingEmail(true)}
            >
              📧 Alterar E-mail
            </button>
            <button 
              className="button btn-action"
              onClick={() => setEditingPassword(true)}
            >
              🔒 Alterar Senha
            </button>
            <button
              className="button btn-logout"
              onClick={handleLogout}
            >
              🚪 Sair
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal: Alterar Nome */}
      {editingName && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>✏️ Alterar Nome</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingName(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveName}>
                <div className="form-group">
                  <label>Novo Nome</label>
                  <input 
                    className="input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome ou nome da empresa" 
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingName}
                  >
                    {loadingName ? "Salvando..." : "💾 Salvar"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingName(false)}
                    disabled={loadingName}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar E-mail */}
      {editingEmail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>📧 Alterar E-mail</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingEmail(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={saveEmail}>
                <div className="form-group">
                  <label>Novo E-mail</label>
                  <input 
                    className="input" 
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="seu@email.com" 
                    required
                  />
                </div>
                <div className="modal-note">
                  ⚠️ Você receberá um e-mail de confirmação no novo endereço.
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingEmail}
                  >
                    {loadingEmail ? "Enviando..." : "📤 Atualizar"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingEmail(false)}
                    disabled={loadingEmail}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {editingPassword && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔒 Alterar Senha</h3>
              <button 
                className="modal-close"
                onClick={() => setEditingPassword(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={savePassword}>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar Senha</label>
                  <input 
                    className="input" 
                    type="password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Digite novamente" 
                    required
                    minLength="6"
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="button btn-primary" 
                    type="submit"
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? "Alterando..." : "🔑 Alterar Senha"}
                  </button>
                  <button 
                    className="button btn-secondary" 
                    type="button"
                    onClick={() => setEditingPassword(false)}
                    disabled={loadingPassword}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}