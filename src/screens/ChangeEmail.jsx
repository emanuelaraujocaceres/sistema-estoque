import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ChangeEmail() {
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleChangeEmail() {
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setMessage("Erro ao alterar e-mail: " + error.message);
    } else {
      setMessage("E-mail atualizado! Verifique a caixa de entrada.");
    }
  }

  return (
    <div className="card">
      <h2>Alterar E-mail</h2>
      <input
        className="input"
        type="email"
        placeholder="Novo e-mail"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
      />

      <button
        className="button btn-primary"
        style={{ marginTop: 12 }}
        onClick={handleChangeEmail}
      >
        Atualizar
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

