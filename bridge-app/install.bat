@echo off
echo ==============================================
echo  Floxync Bridge Setup (v2.0)
echo ==============================================
echo.

echo [1/3] 기존 브릿지 프로세스 종료 중...
taskkill /F /IM floxync-daemon.exe /T >nul 2>&1
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM Floxync-Print-Bridge.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] 브릿지 폴더 생성 및 파일 복사 중...
set DEST=%APPDATA%\FloxyncBridge
if not exist "%DEST%" mkdir "%DEST%"
copy /Y ppbridge.exe "%DEST%\floxync-daemon.exe" >nul
copy /Y SumatraPDF-3.4.6-32.exe "%DEST%\" >nul 2>&1
copy /Y receipt-*.html "%DEST%\" >nul 2>&1
copy /Y .env "%DEST%\.env" >nul 2>&1

echo [3/3] 브릿지 시작 중...
start "" /B "%DEST%\floxync-daemon.exe"
timeout /t 3 /nobreak >nul

echo.
echo =============================================
echo  설치 완료! 브릿지가 백그라운드에서 실행 중입니다.
echo  이 창을 닫아도 됩니다.
echo =============================================
pause
