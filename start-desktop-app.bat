@echo off
TITLE QuickPrint Desktop Counter OS
COLOR 0B

echo ========================================================
echo   QuickPrint Counter OS — Industrial Desktop Terminal
echo ========================================================
echo.
cd /d "%~dp0desktop"

echo Launching QuickPrint Counter OS...
call npx electron .

pause
