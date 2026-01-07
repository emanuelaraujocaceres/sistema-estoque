// src/utils/clean-logs.js - VERSÃO AGGRESSIVA
// Remove TODOS os logs exceto erros críticos

if (typeof window !== 'undefined') {
  const originalConsole = { ...console };
  
  // Lista de logs permitidos (apenas estes serão mostrados)
  const allowedPatterns = [
    'ERROR',
    'Error',
    'error',
    'FAILED',
    'Failed',
    'failed',
    'Exception',
    'exception',
    'Cannot',
    'Uncaught',
    'SyntaxError',
    'TypeError',
    'ReferenceError'
  ];
  
  // Verificar se deve mostrar o log
  const shouldShowLog = (args) => {
    const firstArg = args[0] || '';
    const message = String(firstArg);
    
    // Mostrar se contém padrão de erro
    if (allowedPatterns.some(pattern => message.includes(pattern))) {
      return true;
    }
    
    // Mostrar logs que começam com [ERRO] ou [ERROR]
    if (message.startsWith('[ERRO') || message.startsWith('[ERROR')) {
      return true;
    }
    
    // Mostrar logs de inicialização importantes
    const importantLogs = [
      '[Main] Inicializando',
      '✅',
      '❌',
      '⚠️',
      'Sistema pronto',
      'Aplicação carregada'
    ];
    
    if (importantLogs.some(pattern => message.includes(pattern))) {
      return true;
    }
    
    return false;
  };
  
  // Substituir funções do console
  console.log = function(...args) {
    if (shouldShowLog(args)) {
      originalConsole.log.apply(console, args);
    }
  };
  
  console.info = function(...args) {
    if (shouldShowLog(args)) {
      originalConsole.info.apply(console, args);
    }
  };
  
  console.warn = function(...args) {
    if (shouldShowLog(args)) {
      originalConsole.warn.apply(console, args);
    }
  };
  
  // Sempre mostrar erros
  console.error = originalConsole.error;
  
  console.log('[Clean Logs] Modo silencioso ativado - apenas erros e mensagens críticas');
}
