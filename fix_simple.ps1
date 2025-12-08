Write-Host "🚀 Iniciando correção do projeto..." -ForegroundColor Green

# ================================================
# PASSO 1: Criar diretórios se não existirem
# ================================================

Write-Host "📁 Criando diretórios..." -ForegroundColor Yellow

if (-not (Test-Path "src/services")) {
    New-Item -ItemType Directory -Path "src/services" -Force
}

if (-not (Test-Path "src/auth")) {
    New-Item -ItemType Directory -Path "src/auth" -Force
}

# ================================================
# PASSO 2: Criar supabase.js usando método mais simples
# ================================================

Write-Host "📄 Criando src/services/supabase.js..." -ForegroundColor Yellow

$supabaseFile = "src/services/supabase.js"
Remove-Item -Path $supabaseFile -ErrorAction SilentlyContinue

@"
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    return {
      connected: !error,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

export default supabase;
"@ | Out-File -FilePath $supabaseFile -Encoding UTF8

Write-Host "✅ supabase.js criado" -ForegroundColor Green

# ================================================
# PASSO 3: Criar AuthContext.js
# ================================================

Write-Host "📄 Criando src/auth/AuthContext.js..." -ForegroundColor Yellow

$authContextFile = "src/auth/AuthContext.js"
Remove-Item -Path $authContextFile -ErrorAction SilentlyContinue

@"
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) setUser(data.session.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const signUp = async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) throw error;
    return data.user;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      signUp,
      resetPassword,
      updatePassword,
      supabase 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export { AuthContext };
"@ | Out-File -FilePath $authContextFile -Encoding UTF8

Write-Host "✅ AuthContext.js criado" -ForegroundColor Green

# ================================================
# PASSO 4: Corrigir App.js removendo imports desnecessários
# ================================================

Write-Host "🔧 Corrigindo src/App.js..." -ForegroundColor Yellow

if (Test-Path "src/App.js") {
    $appContent = Get-Content "src/App.js" -Raw
    
    # Remover imports do Supabase se existirem
    $appContent = $appContent -replace "import.*createClient.*", ""
    $appContent = $appContent -replace "import.*supabase.*from.*@supabase/supabase-js.*", ""
    $appContent = $appContent -replace "const.*supabase.*=.*createClient.*", ""
    
    # Garantir que está importando AuthProvider corretamente
    if (-not ($appContent -match "import.*AuthProvider.*from")) {
        # Se não encontrar, adicionar após o último import
        $appContent = $appContent -replace "(import.*from.*\n)", "`$1import { AuthProvider } from './auth/AuthContext';`n"
    }
    
    $appContent | Out-File "src/App.js" -Encoding UTF8
    Write-Host "✅ App.js corrigido" -ForegroundColor Green
}

# ================================================
# PASSO 5: Criar .env.example
# ================================================

Write-Host "📄 Criando .env.example..." -ForegroundColor Yellow

@"
# CONFIGURAÇÕES SUPABASE
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# CONFIGURAÇÕES DE APLICAÇÃO
VITE_APP_NAME=Sistema Estoque & Caixa
VITE_APP_VERSION=2.0.0
"@ | Out-File -FilePath ".env.example" -Encoding UTF8

Write-Host "✅ .env.example criado" -ForegroundColor Green

# ================================================
# PASSO 6: Verificar e corrigir supabaseStock.js
# ================================================

Write-Host "🔧 Verificando supabaseStock.js..." -ForegroundColor Yellow

if (Test-Path "src/services/supabaseStock.js") {
    $supabaseStockContent = Get-Content "src/services/supabaseStock.js" -Raw
    
    # Remover credenciais hardcoded
    $supabaseStockContent = $supabaseStockContent -replace "const supabaseUrl = 'https://fsktcwbtzrnnkjpzfchv.supabase.co';", ""
    $supabaseStockContent = $supabaseStockContent -replace "const supabaseKey = 'sb_publishable_y0mFmK-_hfg2yXz5DRcCHQ_zZYE-cyY';", ""
    
    # Substituir import do createClient pelo import do supabase
    $supabaseStockContent = $supabaseStockContent -replace "import { createClient } from '@supabase/supabase-js';", "import { supabase } from './supabase';"
    $supabaseStockContent = $supabaseStockContent -replace "export const supabase = createClient\(supabaseUrl, supabaseKey\);", ""
    
    $supabaseStockContent | Out-File "src/services/supabaseStock.js" -Encoding UTF8
    Write-Host "✅ supabaseStock.js corrigido" -ForegroundColor Green
}

# ================================================
# PASSO 7: Resumo final
# ================================================

Write-Host ""
Write-Host "🎉 CORREÇÕES APLICADAS COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Arquivos criados/corrigidos:" -ForegroundColor Cyan
Write-Host "   1. ✅ src/services/supabase.js (configuração única)"
Write-Host "   2. ✅ src/auth/AuthContext.js (contexto corrigido)"
Write-Host "   3. ✅ src/App.js (imports limpos)"
Write-Host "   4. ✅ .env.example (template de configuração)"
if (Test-Path "src/services/supabaseStock.js") {
    Write-Host "   5. ✅ src/services/supabaseStock.js (removidas credenciais hardcoded)"
}
Write-Host ""
Write-Host "🚀 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure suas credenciais do Supabase:"
Write-Host "   copy .env.example .env"
Write-Host "   # Edite o arquivo .env com suas credenciais reais"
Write-Host ""
Write-Host "2. Verifique se precisa instalar dependências:"
Write-Host "   npm install @supabase/supabase-js"
Write-Host ""
Write-Host "3. Inicie o servidor de desenvolvimento:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "4. Se encontrar erros, verifique:"
Write-Host "   - Se as credenciais no .env estão corretas"
Write-Host "   - Se @supabase/supabase-js está instalado"
Write-Host "   - Se há erros no console do navegador"
Write-Host ""