@echo off
echo ==============================================
echo Floxync Bridge POS Printer Setup (v1.1)
echo ==============================================
echo.
echo Starting bridge setup...
echo.
echo 1. Terminating existing background bridge services...
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM LilyMag-Print-Bridge.exe /T >nul 2>&1
echo.
echo 2. Installing bridge program as a background service...
echo (Configured to hide the terminal window and run automatically.)
echo Please wait...
echo.

ppbridge.exe

echo.
echo Setup (Update) complete!
echo A popup will appear if the installation is successful.
echo You can now close this window.
pause
