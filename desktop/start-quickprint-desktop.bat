@echo off
TITLE QuickPrint Desktop Counter OS & Print Agent
COLOR 0A

echo ========================================================
echo   QuickPrint Counter OS & Automated Print Agent
echo ========================================================
echo.
echo [1/3] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Checking Electron desktop dependencies...
if not exist "node_modules\electron" (
    echo Installing QuickPrint Desktop runtime (one-time setup)...
    call npm install
)

echo [3/3] Launching QuickPrint Desktop Counter Application...
echo The app will run in your Windows System Tray with native alerts!
npx electron .

pause
