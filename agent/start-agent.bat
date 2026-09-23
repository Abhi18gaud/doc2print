@echo off
title QuickPrint Local Windows Print Agent
echo ========================================================
echo        Starting QuickPrint Local Print Agent...
echo ========================================================
echo.
cd /d "%~dp0"

if not exist node_modules (
  echo Installing agent dependencies...
  call npm install
)

echo Starting agent...
node index.js
pause
