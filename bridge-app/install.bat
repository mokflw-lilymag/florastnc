@echo off
chcp 65001 >nul 2>&1
echo ==============================================
echo Floxync Bridge POS Printer Setup (v1)
echo ==============================================
echo.
echo 브릿지 설정을 시작합니다...
echo.
echo 1. 기존에 실행중인 백그라운드 브릿지 서비스를 완전히 종료합니다...
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM LilyMag-Print-Bridge.exe /T >nul 2>&1
echo.
echo 2. 브릿지 프로그램을 윈도우 백그라운드 서비스로 완벽 설치합니다...
echo (검은색 터미널 창을 숨기고 자동 실행되도록 구성합니다.)
echo 잠시만 기다려주세요...
echo.

ppbridge.exe

echo.
echo 팝업창으로 '설치(업데이트)가 완료되었습니다' 메시지가 뜨면 성공입니다!
echo 이제 이 창을 닫으셔도 됩니다.
pause

