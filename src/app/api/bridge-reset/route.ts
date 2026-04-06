import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Default to 25.0 format (converted to 25_0 for filename)
  const rawVersion = searchParams.get('v') || '25.0';
  const version = rawVersion.replace(/\./g, '_');
  const baseURL = new URL(request.url).origin;
  
  const batContent = `@echo off
setlocal
title [Ribbon Bridge] One-Click Auto Repair & Update Tool

echo.
echo ======================================================
echo    Ribbon Bridge One-Click Auto Repair (Nuclear)
echo ======================================================
echo.
echo This tool will automatically:
echo 1. Force close running bridge processes (Unlocking files)
echo 2. Download the latest installer (v${rawVersion})
echo 3. Launch the setup program immediately
echo.
echo [IMPORTANT] Any pending print jobs will be lost.
echo.
echo Press any key to start the repair process...
pause >nul

echo.
echo [1/3] Step 1: Force closing background processes...
taskkill /f /im launch_service.exe /t >nul 2>&1
taskkill /f /im RibbonBridge_Core.exe /t >nul 2>&1
taskkill /f /im RibbonBridge.exe /t >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Step 2: Downloading latest installer from server...
set DOWNLOAD_URL=${baseURL}/RibbonBridge_Setup_v${version}.exe
set SAVE_PATH=%TEMP%\\RibbonBridge_Setup_v${version}.exe

echo Source: %DOWNLOAD_URL%
echo Target: %SAVE_PATH%

:: Try download with PowerShell
powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%SAVE_PATH%'"

if exist "%SAVE_PATH%" (
    echo.
    echo [3/3] Step 3: Download successful! Launching installer...
    start "" "%SAVE_PATH%"
) else (
    echo.
    echo [ERROR] Download failed. Please check your internet connection.
    echo Site URL: ${baseURL}
    pause
    exit
)

echo.
echo Repair script completed. 
echo After the installer finishes, please REFRESH your browser.
timeout /t 5 >nul
exit
`;

  return new NextResponse(batContent, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename=Bridge_Auto_Repair.bat',
    },
  });
}
