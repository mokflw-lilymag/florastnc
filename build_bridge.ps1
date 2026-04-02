$ErrorActionPreference = "Stop"
try {
    Write-Host "--- Emergency Bridge Builder v25.0 ---" -ForegroundColor Cyan
    $csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    $root = Get-Location
    if ($root.Path.EndsWith("bridge_temp")) { Set-Location ".." }
    
    if (-not (Test-Path "bridge_temp")) { New-Item -ItemType Directory -Path "bridge_temp" -Force }
    Set-Location "bridge_temp"
    
    Write-Host "[1] Compiling GDI Engine..." -ForegroundColor Yellow
    & $csc /target:exe /nologo /out:ribbon_printer.exe ribbon_printer.cs
    
    Write-Host "[2] Compiling Watchdog..." -ForegroundColor Yellow
    & $csc /target:winexe /nologo /out:launch_service.exe RibbonLauncher.cs
    
    Write-Host "[3] Compiling Node.js Server (pkg)..." -ForegroundColor Yellow
    npx pkg bridge_server.js -t node18-win-x64 --output RibbonBridge_Core.exe
    
    Write-Host "[4] Creating Package ZIP..." -ForegroundColor Yellow
    if (Test-Path "pkg") { Remove-Item "pkg" -Recurse -Force }
    New-Item -ItemType Directory -Path "pkg" -Force | Out-Null
    Copy-Item "RibbonBridge_Core.exe" -Destination "pkg\" -Force
    Copy-Item "ribbon_printer.exe" -Destination "pkg\" -Force
    Copy-Item "launch_service.exe" -Destination "pkg\" -Force
    if (Test-Path "RibbonBridgePackage.zip") { Remove-Item "RibbonBridgePackage.zip" -Force }
    Compress-Archive -Path "pkg\*" -DestinationPath "RibbonBridgePackage.zip" -Force
    
    Write-Host "[DEBUG] Current Directory: $(Get-Location)" -ForegroundColor Gray
    Write-Host "[5] Compiling FINAL Nuclear Installer..." -ForegroundColor Green
    $compileArgs = @(
        "/target:winexe",
        "/nologo",
        "/out:RibbonBridge_Setup_v25_0.exe",
        "/resource:RibbonBridgePackage.zip",
        "/r:System.IO.Compression.dll",
        "/r:System.IO.Compression.FileSystem.dll",
        "/r:System.Windows.Forms.dll",
        "/r:System.Drawing.dll",
        "RibbonInstaller.cs"
    )
    & $csc $compileArgs
    
    Write-Host "[6] Shipping to Public Dashboard..." -ForegroundColor Cyan
    Set-Location ".."
    if (-not (Test-Path "public")) { New-Item -ItemType Directory -Path "public" -Force }
    Copy-Item "bridge_temp\RibbonBridge_Setup_v25_0.exe" -Destination "public\RibbonBridge_Setup_v25_0.exe" -Force
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   VICTORY! v25.0 Installer Finalized." -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan

} catch {
    Write-Host "FATAL BUILD ERROR: $_" -ForegroundColor Red
    exit 1
}
