Unicode true
!include "MUI2.nsh"
!define MUI_ABORTWARNING

Name "Floxync Bridge Manager"
OutFile "..\public\downloads\Floxync-Bridge-Setup.exe"
InstallDir "$APPDATA\FloxyncBridge"
RequestExecutionLevel user
ShowInstDetails show

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  
  # Terminate existing processes
  DetailPrint "Terminating existing Bridge processes..."
  ExecWait 'taskkill /F /IM Floxync-BridgeManager.exe /T'
  ExecWait 'taskkill /F /IM floxync-daemon.exe /T'
  ExecWait 'taskkill /F /IM ppbridge.exe /T'
  ExecWait 'taskkill /F /IM launch_service.exe /T'
  ExecWait 'taskkill /F /IM RibbonBridge_Core.exe /T'
  Sleep 1500
  
  # Copy files
  File "Floxync-BridgeManager.exe"
  File "floxync-daemon.exe"
  SetOutPath "$LOCALAPPDATA\RibbonBridge"
  File /r "RibbonBridge\*"
  
  SetOutPath "$INSTDIR"

  # Remove auto-start from registry to prevent ghost processes
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "FloxyncBridge"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RibbonBridgeService"

  # Desktop and Start Menu shortcuts
  CreateShortCut "$DESKTOP\Floxync Bridge Manager.lnk" "$INSTDIR\Floxync-BridgeManager.exe"
  CreateDirectory "$SMPROGRAMS\Floxync"
  CreateShortCut "$SMPROGRAMS\Floxync\Floxync Bridge Manager.lnk" "$INSTDIR\Floxync-BridgeManager.exe"

  # Uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  # Execute after install
  Exec "$INSTDIR\Floxync-BridgeManager.exe"
SectionEnd

Section "Uninstall"
  ExecWait 'taskkill /F /IM Floxync-BridgeManager.exe /T'
  ExecWait 'taskkill /F /IM floxync-daemon.exe /T'
  ExecWait 'taskkill /F /IM launch_service.exe /T'
  Sleep 1500

  Delete "$DESKTOP\Floxync Bridge Manager.lnk"
  Delete "$SMPROGRAMS\Floxync\Floxync Bridge Manager.lnk"
  RMDir "$SMPROGRAMS\Floxync"
  Delete "$INSTDIR\Floxync-BridgeManager.exe"
  Delete "$INSTDIR\floxync-daemon.exe"
  Delete "$INSTDIR\ppbridge.vbs"
  RMDir /r "$LOCALAPPDATA\RibbonBridge"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
