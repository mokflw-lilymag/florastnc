@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  Floxync PP Bridge Setup v2.12
echo ==============================================
echo.
echo Install folder: %~dp0
echo.

if not exist "ppbridge.exe" (
  echo [ERROR] ppbridge.exe not found in this folder.
  echo Extract Floxync-Bridge-Setup.zip fully and run install.bat again.
  echo.
  pause
  exit /b 1
)

echo [0/3] Unblocking downloaded files (Windows security)...
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue" >nul 2>&1

echo [1/3] Stopping old bridge processes...
taskkill /F /IM floxync-daemon.exe /T >nul 2>&1
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM Floxync-Print-Bridge.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Installing via ppbridge.exe ...
echo Target folder: %APPDATA%\FloxyncBridge
echo.

ppbridge.exe
set INSTALL_ERR=%ERRORLEVEL%

if not "%INSTALL_ERR%"=="0" (
  echo.
  echo [ERROR] PP Bridge installation failed (exit %INSTALL_ERR%).
  echo Check log: %APPDATA%\FloxyncBridge\daemon.log
  echo Tips: run install.bat as Administrator, allow ppbridge.exe in antivirus.
  echo.
  pause
  exit /b %INSTALL_ERR%
)

echo.
echo [3/3] Verifying local heartbeat on port 8004...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8004/api/version -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo [WARN] Bridge process started but port 8004 is not responding yet.
  echo Wait 10 seconds, refresh Floxync web app, or check %APPDATA%\FloxyncBridge\daemon.log
) else (
  echo OK — PP Bridge is running. Refresh the Floxync web app (PP ON).
)

echo.
pause
exit /b 0
