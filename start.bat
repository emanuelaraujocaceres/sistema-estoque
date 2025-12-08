@echo off
echo ============================
echo  INICIANDO SISTEMA DE ESTOQUE
echo ============================
echo.
if not exist node_modules (
  echo Instalando dependências...
  npm install
)
echo.
echo Servidor iniciando...
echo Acesse: http://localhost:5173
echo.
npm run dev
