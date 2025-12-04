import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="card">
      <h2>Bem-vindo</h2>
      <p className="small">Use os botões abaixo para acessar o estoque e o caixa.</p>
      <div style={{display:"flex", gap:10, marginTop:12}}>
        <Link to="/products"><button className="button btn-primary">Controle de Estoque</button></Link>
        <Link to="/sales"><button className="button btn-primary">Controle de Caixa</button></Link>
        <Link to="/reports"><button className="button">Relatórios</button></Link>
      </div>
    </div>
  );
}

export default Home;
