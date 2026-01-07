import { useState } from "react";
import { useAuth } from "../auth/AuthContext"; // ✅ MUDOU AQUI! (não services/auth/)
import { useNavigate } from "react-router-dom";

export default function Login(){
  const { login } = useAuth(); // ✅ MUDOU: de 'signIn' para 'login' (conforme AuthContext)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password); // ✅ MUDOU: de 'signIn' para 'login'
      nav("/");
    } catch (err) {
      alert(err.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2>Entrar</h2>
        <label className="small">E-mail</label>
        <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label className="small">Senha</label>
        <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{display:"flex", justifyContent:"space-between", marginTop:12}}>
          <button className="button btn-primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </div>
        <p className="small" style={{marginTop:12}}>Conta apenas por convite. Peça ao administrador.</p>
      </form>
    </div>
  )
}

const styles = {
  wrap:{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"70vh" },
  card:{ width:360, padding:18, borderRadius:8, background:"#fff", boxShadow:"0 6px 18px rgba(0,0,0,0.08)" }
}