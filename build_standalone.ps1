$ErrorActionPreference = "Stop"

# Paths
$nsisPath = "$env:LOCALAPPDATA\electron-builder\Cache\nsis\nsis-3.0.4.1-nsis-3.0.4.1\makensis.exe"
$outDir = "bridge-standalone-build"

Write-Host "1. Compiling BridgeManager GUI..."
cd bridge-manager
.\build.ps1
cd ..

Write-Host "2. Creating staging directory..."
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Write-Host "3. Copying files..."
Copy-Item "bridge-manager\Floxync-BridgeManager.exe" "$outDir\" -Force
Copy-Item "bridge-app\ppbridge.exe" "$outDir\floxync-daemon.exe" -Force

# Create ppbridge.vbs
$vbsContentStatic = @"
Set WshShell = CreateObject("WScript.Shell")
strPath = Wscript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.GetFile(strPath)
strFolder = objFSO.GetParentFolderName(objFile) 
WshShell.CurrentDirectory = strFolder
WshShell.Run chr(34) & strFolder & "\floxync-daemon.exe" & chr(34), 0, False
Set WshShell = Nothing
"@
Set-Content -Path "$outDir\ppbridge.vbs" -Value $vbsContentStatic -Encoding Default

Write-Host "4. Extracting RibbonBridgePackage.zip..."
if (-not (Test-Path "$outDir\RibbonBridge")) {
    Expand-Archive -LiteralPath "vendor\ribbon-bridge\RibbonBridgePackage.zip" -DestinationPath "$outDir\RibbonBridge" -Force
}


Write-Host "6. Building setup executable..."
if (-not (Test-Path $nsisPath)) {
    Write-Error "makensis.exe not found at $nsisPath"
    exit 1
}

# Patch subsystem for Ribbon Bridge to prevent ghost windows
Write-Host "Patching Ribbon Bridge executables for GUI subsystem..."
python patch.py "$outDir\RibbonBridge\launch_service.exe"
python patch.py "$outDir\RibbonBridge\RibbonBridge_Core.exe"

cd $outDir
& $nsisPath "installer.nsi"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build complete! Setup is located at public/downloads/Floxync-Bridge-Setup.exe" -ForegroundColor Green
} else {
    Write-Error "NSIS Build failed!"
}
