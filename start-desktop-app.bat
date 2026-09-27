@echo off
TITLE QuickPrint Desktop Counter OS
COLOR 0B

:: Kill any stale QuickPrint processes to release the single-instance lock
taskkill /F /IM "QuickPrint Counter OS.exe" >nul 2>&1
taskkill /F /IM "electron.exe" >nul 2>&1
timeout /t 1 /nobreak >nul

echo ========================================================
echo   QuickPrint Counter OS - Industrial Desktop Terminal
echo ========================================================
echo.
cd /d "%~dp0desktop"

echo Launching QuickPrint Counter OS...
call npx electron .

pause
