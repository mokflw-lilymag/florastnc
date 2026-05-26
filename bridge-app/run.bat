@echo off
chcp 65001 > nul
title LilyMag POS Print Bridge
echo ==========================================
echo LilyMag POS Print Bridge (PP) 시작 중...
echo ==========================================

REM .env 파일이 없으면 .env.example을 복사해서 생성
if not exist .env (
    echo [안내] .env 파일이 없어서 기본 템플릿으로 생성합니다.
    copy .env.example .env > nul
    echo [필수] 생성된 .env 파일을 메모장으로 열어서 BRANCH_ID 등을 입력한 후 다시 실행해주세요!
    pause
    exit
)

echo 패키지를 점검 및 설치합니다 (최초 1회 시간이 걸릴 수 있습니다)...
call npm install --no-fund --no-audit

echo.
echo 브릿지를 실행합니다...
node index.js

pause
