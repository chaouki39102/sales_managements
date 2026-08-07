# start-helper.ps1 — hidden, detached launcher for the control helper (8777)
# and the app server (8000). Idempotent: only starts what is not already running.
# Used by the Windows logon task and runnable manually.
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File server-helper\start-helper.ps1
param([switch]$SkipApp)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$php  = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $php) { Write-Error 'php not found in PATH'; exit 1 }

function PortUp([int]$port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

if (-not (PortUp 8777)) {
    Start-Process -FilePath $php -ArgumentList '-S','0.0.0.0:8777','server-helper\router.php' `
        -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Seconds 1
}

if (-not $SkipApp -and -not (PortUp 8000)) {
    Start-Process -FilePath $php -ArgumentList 'artisan','serve','--host=0.0.0.0','--port=8000' `
        -WorkingDirectory $root -WindowStyle Hidden
}
