// test-link-error.js
try {
    console.log("Testando problemas com Link...");
    
    // Simule o erro
    if (typeof Link !== 'undefined') {
        console.log("Link está definido globalmente");
    } else {
        console.log("ERROR: Link não está definido");
        console.log("Isso acontece quando:");
        console.log("1. Você está importando 'next/link' mas não usa Next.js");
        console.log("2. Está faltando importação de react-router-dom");
        console.log("3. Há um erro de digitação (Link vs link)");
    }
    
    // Verifique módulos
    try {
        require('next/link');
        console.log("Next.js Link está disponível");
    } catch (e) {
        console.log("Next.js não está instalado ou Link não disponível");
    }
    
    try {
        require('react-router-dom');
        console.log("React Router DOM está disponível");
    } catch (e) {
        console.log("React Router DOM não está instalado");
    }
} catch (error) {
    console.error("Erro no teste:", error.message);
}
