// src/screens/Home.jsx
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function Home() {
  const { user, supabase } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [loadingName, setLoadingName] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  async function saveName(e) {
    e?.preventDefault();
    setLoadingName(true);
    try {
      // supabase-js v2: updateUser accepts { data: { ... } }
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
    <div>
      <div className="card">
        <h2>Perfil</h2>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:18, fontWeight:600}}>{displayName}</div>
            <div className="small">{user?.email}</div>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <h4>Informações</h4>
          <div className="small">Nome: {user?.user_metadata?.name || "—"}</div>
          <div className="small">E-mail: {user?.email}</div>
        </div>

        <div style={{marginTop:12, display:"flex", gap:8}}>
          <button className="button" onClick={()=>setEditingName(true)}>Alterar nome</button>
          <button className="button" onClick={()=>setEditingEmail(true)}>Alterar e-mail</button>
          <button className="button" onClick={()=>setEditingPassword(true)}>Alterar senha</button>
        </div>
      </div>

      {editingName && (
        <div className="card">
          <h3>Alterar nome</h3>
          <form onSubmit={saveName}>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nome da empresa ou usuário" />
            <div style={{marginTop:8}}>
              <button className="button btn-primary" disabled={loadingName}>{loadingName ? "Salvando..." : "Salvar"}</button>
              <button className="button" style={{marginLeft:8}} type="button" onClick={()=>setEditingName(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {editingEmail && (
        <div className="card">
          <h3>Alterar e-mail</h3>
          <form onSubmit={saveEmail}>
            <input className="input" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Novo e-mail" />
            <div style={{marginTop:8}}>
              <button className="button btn-primary" disabled={loadingEmail}>{loadingEmail ? "Enviando..." : "Atualizar e-mail"}</button>
              <button className="button" style={{marginLeft:8}} type="button" onClick={()=>setEditingEmail(false)}>Cancelar</button>
            </div>
          </form>
          <p className="small" style={{marginTop:8}}>Você pode precisar confirmar esse novo e-mail via link enviado.</p>
        </div>
      )}

      {editingPassword && (
        <div className="card">
          <h3>Alterar senha</h3>
          <form onSubmit={savePassword}>
            <input className="input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nova senha (mínimo 6 caracteres)" />
            <div style={{marginTop:8}}>
              <button className="button btn-primary" disabled={loadingPassword}>{loadingPassword ? "Alterando..." : "Alterar senha"}</button>
              <button className="button" style={{marginLeft:8}} type="button" onClick={()=>setEditingPassword(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
