$csc = "$env:windir\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if (!(Test-Path $csc)) {
    Write-Host "C# Compiler not found!" -ForegroundColor Red
    exit 1
}

$source = "BridgeManager.cs"
$output = "Floxync-BridgeManager.exe"

& $csc /target:winexe /out:$output $source
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Success: $output" -ForegroundColor Green
} else {
    Write-Host "Build Failed!" -ForegroundColor Red
}
