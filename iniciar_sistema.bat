@echo off
title EleiçãoAI — Servidor de Desenvolvimento
color 0A

echo.
echo  ==========================================
echo   EleiçãoAI — Iniciando servidor...
echo  ==========================================
echo.

cd /d "%~dp0"

:: Verifica se node_modules existe
if not exist "node_modules" (
  echo  [!] Dependencias nao instaladas. Instalando...
  echo.
  npm install
  echo.
)

:: Verifica se .env.local existe
if not exist ".env.local" (
  echo  [AVISO] Arquivo .env.local nao encontrado!
  echo  Copie o .env.example e preencha as credenciais.
  echo.
  pause
  exit /b 1
)

echo  Acesse: http://localhost:3000
echo  Pressione Ctrl+C para encerrar.
echo.

npx next dev --port 3000
