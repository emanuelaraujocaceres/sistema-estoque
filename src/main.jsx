// main.jsx - ponto de entrada SIMPLES
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Desabilitar DevTools e profiling
if (process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === "string") {
      // Filtrar mensagens de profiling
      if (args[0].includes("Profiling") || args[0].includes("profiling")) {
        return;
      }
      if (args[0].includes("ReactDOM.render")) {
        return;
      }
    }
    originalError.apply(console, args);
  };
}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Elemento #root não encontrado");
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.Fragment>
      <App />
    </React.Fragment>
  );
  
  console.log(" Aplicação React inicializada");
} catch (error) {
  console.error(" Erro ao iniciar React:", error);
  document.getElementById("root").innerHTML = `
    <div style="color: red; padding: 50px;">
      <h2>Erro na aplicação</h2>
      <p>${error.message}</p>
      <button onclick="window.location.reload()">Recarregar</button>
    </div>
  `;
}
