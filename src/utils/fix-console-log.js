// src/utils/fix-console-log.js
// Este arquivo garante que todos os logs sejam UTF-8

if (typeof window !== 'undefined') {
  // Salvar funções originais
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  
  // Função para garantir UTF-8
  const ensureUTF8 = (args) => {
    return args.map(arg => {
      if (typeof arg === 'string') {
        // Remove caracteres não-UTF8
        return arg.replace(/[^\x00-\x7F]/g, '?');
      }
      return arg;
    });
  };
  
  // Substituir funções do console
  console.log = function(...args) {
    originalConsoleLog.apply(console, ensureUTF8(args));
  };
  
  console.warn = function(...args) {
    originalConsoleWarn.apply(console, ensureUTF8(args));
  };
  
  console.error = function(...args) {
    originalConsoleError.apply(console, ensureUTF8(args));
  };
  
  console.info = function(...args) {
    originalConsoleInfo.apply(console, ensureUTF8(args));
  };
  
  console.log('[Console Fix] Encoding UTF-8 aplicado');
}
