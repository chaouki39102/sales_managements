# register-autostart.ps1 - makes the dev servers start AUTOMATICALLY at logon.
#
# Creates a Windows scheduled task "ERP-ServerHelper" that runs at logon and
# launches (hidden, detached):
#   - the control helper  on port 8777  (server-helper/router.php)
#   - the app server      on port 8000  (php artisan serve)
#
# The helper also auto-starts the app server whenever it is down (watchdog on
# /api/status), so even if the app crashes later it comes back on its own.
#
# If creating the scheduled task is denied (no admin rights), it falls back to
# a hidden VBS in the per-user Startup folder - no elevation needed.
#
# Re-run this file to update/re-register. To remove the autostart entry,
# delete the startup VBS or run:  Unregister-ScheduledTask -TaskName
# 'ERP-ServerHelper' -Confirm:$false
#
# NOTE: keep this file ASCII-only. PowerShell 5.1 reads .ps1 files without a
# BOM as ANSI, and UTF-8 special chars (em-dash, checkmark) decode into smart
# quotes that break parsing.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $root 'server-helper\start-helper.ps1'

if (-not (Test-Path -LiteralPath $launcher)) {
    Write-Error "launcher not found: $launcher"; exit 1
}

$registered = $false
try {
    $action   = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
    $trigger  = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask -TaskName 'ERP-ServerHelper' -Action $action -Trigger $trigger `
        -Settings $settings -Force | Out-Null
    Write-Host 'OK - scheduled task registered: ERP-ServerHelper (runs at logon)'
    $registered = $true
} catch {
    Write-Warning "Scheduled task unavailable (may need admin): $($_.Exception.Message)"
}

if (-not $registered) {
    # Fallback: Startup-folder VBS - per-user, no admin needed, runs hidden at logon.
    $startup = [Environment]::GetFolderPath('Startup')
    $vbsPath = Join-Path $startup 'ERP-ServerHelper.vbs'
    $vbs = 'Set sh = CreateObject("WScript.Shell")' + "`r`n" +
           'sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""' +
           $launcher + '""", 0, False' + "`r`n"
    Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
    if (Test-Path -LiteralPath $vbsPath) {
        Write-Host "OK - startup entry created: $vbsPath (runs hidden at logon)"
    } else {
        Write-Warning 'Could not create Startup entry.'
    }
}

# Start right now (idempotent - skips ports already up).
& $launcher
Write-Host 'OK - servers launched (helper 8777 + app 8000) - see status.html / http://localhost:8777'
