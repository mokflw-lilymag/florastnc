@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  Floxync PP Bridge Setup v2.6
echo ==============================================
echo.
echo Install folder: %~dp0
echo.

if not exist "ppbridge.exe" (
  echo [ERROR] ppbridge.exe not found in this folder.
  echo Extract Floxync-Bridge-Setup.zip and run install.bat again.
  echo.
  pause
  exit /b 1
)

echo [1/2] Stopping old bridge processes...
taskkill /F /IM floxync-daemon.exe /T >nul 2>&1
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM Floxync-Print-Bridge.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/2] Installing via ppbridge.exe ...
echo Target folder: %APPDATA%\FloxyncBridge
echo.

ppbridge.exe

echo.
echo Done. If a success popup appeared, the bridge is running.
echo Open Floxync web app and check PP Bridge status is ON.
echo Log: %APPDATA%\FloxyncBridge\daemon.log
echo.
pause
exit /b 0
