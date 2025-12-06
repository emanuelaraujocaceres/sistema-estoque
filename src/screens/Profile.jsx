import { useAuth } from "../auth/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div>
      <h2>Perfil do Usuário</h2>
      
      <div className="card">
        {user ? (
          <>
            <p><strong>Nome:</strong> {user.user_metadata?.full_name || user.email}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
            
            <button 
              onClick={handleLogout}
              className="button btn-danger"
              style={{ marginTop: "20px" }}
            >
              🚪 Sair da Conta
            </button>
          </>
        ) : (
          <p>Nenhum usuário logado</p>
        )}
      </div>
    </div>
  );
}