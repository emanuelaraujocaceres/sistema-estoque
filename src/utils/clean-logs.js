// src/utils/clean-logs.js - MODO SUPER SILENCIOSO
// Mostra APENAS o absolutamente necessário

if (typeof window !== 'undefined') {
  const originalConsole = { ...console };
  
  // APENAS ESTES LOGS SERÃO MOSTRADOS
  const showOnlyThese = [
    '[ERRO]',
    '[ERROR]',
    '❌',
    'Uncaught',
    'Error:',
    'Failed to',
    'Cannot',
    'Sistema pronto',
    'Aplicação carregada'
  ];
  
  const shouldShow = (args) => {
    if (!args.length) return false;
    
    const message = String(args[0]);
    
    // Mostrar apenas se estiver na lista branca
    return showOnlyThese.some(pattern => message.includes(pattern));
  };
  
  // Substituir TODAS as funções do console
  const functions = ['log', 'info', 'warn', 'debug', 'dir', 'table', 'trace'];
  
  functions.forEach(func => {
    if (console[func]) {
      console[func] = function(...args) {
        if (shouldShow(args)) {
          originalConsole[func].apply(console, args);
        }
      };
    }
  });
  
  // Manter error original (mas filtrar também)
  console.error = function(...args) {
    if (shouldShow(args)) {
      originalConsole.error.apply(console, args);
    }
  };
  
  // UM ÚNICO LOG para confirmar que está funcionando
  originalConsole.log('[Clean Logs] Modo super silencioso: apenas erros críticos visíveis');
}
