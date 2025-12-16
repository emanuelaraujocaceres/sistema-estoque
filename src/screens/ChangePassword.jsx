import { useState } from "react";
import supabase from "../services/supabaseClient";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleChangePassword() {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("Erro ao alterar senha: " + error.message);
    } else {
      setMessage("Senha atualizada com sucesso!");
    }
  }

  return (
    <div className="card">
      <h2>Alterar Senha</h2>

      <input
        className="input"
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="button btn-primary"
        style={{ marginTop: 12 }}
        onClick={handleChangePassword}
      >
        Atualizar
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
