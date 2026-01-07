// src/utils/clean-logs.js
// Adicione isso ao seu main.jsx ou App.jsx para reduzir logs desnecessários

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Filtra logs do Supabase/Auth muito verbosos
console.log = function(...args) {
  const message = args[0] || '';
  
  // Filtra logs muito verbosos (mantém apenas os importantes)
  const skipPatterns = [
    '[AuthContext] Auth state changed',
    '[AuthContext] Sessão inicial',
    'Instancia ID:',
    'Nenhum dado encontrado'
  ];
  
  const shouldSkip = skipPatterns.some(pattern => 
    typeof message === 'string' && message.includes(pattern)
  );
  
  if (!shouldSkip) {
    originalLog.apply(console, args);
  }
};

// Mantém warns e errors originais
console.warn = originalWarn;
console.error = originalError;

console.log('[Clean Logs] Filtro de logs ativado');
