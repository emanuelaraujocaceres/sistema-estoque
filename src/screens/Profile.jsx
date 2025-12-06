import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);

  // avatar baseado no email
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`;

  return (
    <div className="card">
      <h2>Perfil</h2>

      <img 
        src={avatar} 
        alt="avatar"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          marginBottom: 12
        }}
      />

      <p><strong>E-mail:</strong> {user?.email}</p>

      <div style={{ marginTop: 20 }}>
        <Link to="/change-email">
          <button className="button btn-primary" style={{ marginRight: 10 }}>
            Alterar E-mail
          </button>
        </Link>

        <Link to="/change-password">
          <button className="button btn-primary" style={{ marginRight: 10 }}>
            Alterar Senha
          </button>
        </Link>

        <button className="button btn-danger" onClick={logout}>
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
