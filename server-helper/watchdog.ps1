# server-helper/watchdog.ps1 - persistent auto-repair watchdog (hidden, detached).
#
# Runs forever in the background. Every 15s it:
#   1. Ensures the control helper (8777) is listening - restarts it if it died.
#   2. If the app server (8000) is down, asks the helper for /api/status, which
#      runs the helper's own auto-start watchdog (maybe_auto_start) and brings
#      the app back up automatically (respecting manual-stop cooldowns).
#
# This is the missing link that makes ERR_CONNECTION_REFUSED self-healing:
# even when `php artisan serve` dies (closed CMD window, crash, reboot of just
# the child), the app comes back within ~20s with no human action.
#
# Launched hidden at Windows logon via ERP-ServerHelper.vbs -> start-helper.ps1.
# start-helper.ps1 spawns this unconditionally; the named mutex below makes a
# second instance exit immediately, so re-runs are harmless (no race-prone
# command-line scanning).

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Single-instance guard (named mutex - auto-released by the OS if we die).
$mutex = New-Object System.Threading.Mutex($false, 'ERP_SalesManagement_Watchdog_Mutex')
if (-not $mutex.WaitOne(0)) { exit 0 }

function PortUp([int]$port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

$php = (Get-Command php -ErrorAction SilentlyContinue).Source
$script:funnelTick = 0

while ($true) {
    try {
        # 1. Keep the control helper alive (it is the only process that can
        #    launch the app server, so it must never be down silently).
        if (-not (PortUp 8777)) {
            if ($php) {
                Start-Process -FilePath $php -ArgumentList '-S', '0.0.0.0:8777', 'server-helper\router.php' `
                    -WorkingDirectory $root -WindowStyle Hidden
                Start-Sleep -Seconds 2
            }
        }

        # 2. App down? Ask the helper to auto-start it. /api/status runs the
        #    helper's maybe_auto_start (rate-limited, respects manual stops).
        if (-not (PortUp 8000) -and (PortUp 8777)) {
            try {
                Invoke-WebRequest -Uri 'http://127.0.0.1:8777/api/status' -TimeoutSec 6 -UseBasicParsing | Out-Null
            } catch {
                # helper busy/restarting - next cycle will retry
            }
        }

        # 3. Keep the public order page reachable: if the app server is up but
        #    Tailscale Funnel is off, re-enable it. Idempotent + throttled to
        #    once a minute so the tailscale CLI is not spawned every 15s.
        if (PortUp 8000) {
            $script:funnelTick++
            if ($script:funnelTick -ge 4) {
                $script:funnelTick = 0
                if (Test-Path -LiteralPath 'C:\Program Files\Tailscale\tailscale.exe') {
                    try {
                        $fs = & 'C:\Program Files\Tailscale\tailscale.exe' funnel status 2>&1 | Out-String
                        if ($fs -notmatch 'Funnel on') {
                            & 'C:\Program Files\Tailscale\tailscale.exe' funnel --bg 8000 2>&1 | Out-Null
                        }
                    } catch {
                        # tailscale busy - next minute will retry
                    }
                }
            }
        }
    } catch {
        # never let the loop die on a transient error
    }
    Start-Sleep -Seconds 15
}
