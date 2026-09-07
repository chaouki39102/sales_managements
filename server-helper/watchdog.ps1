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

# Project root = parent of this script's directory (server-helper\watchdog.ps1
# → C:\...\sales_managements). All php / artisan / router paths are root-relative.
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Machine-specific settings (shared with share-public-order.ps1). If the
# config file is missing, the standard Tailscale install path is used.
$TailscaleCli = 'C:\Program Files\Tailscale\tailscale.exe'
$AppPort = 8000
$configPath = Join-Path $root 'share-public-order.config.ps1'
if (Test-Path -LiteralPath $configPath) { . $configPath }

# Shared funnel health helpers (Get-FunnelUrl, Test-FunnelPublicPath). Probes
# the PUBLIC ingress (DoH + curl --resolve) - a status-only check cannot detect
# a dead ingress backhaul (2026-09-07 incident).
$funnelHealth = Join-Path $root 'server-helper\funnel-health.ps1'
if (Test-Path -LiteralPath $funnelHealth) { . $funnelHealth }

# Single-instance guard (named mutex - auto-released by the OS if we die).
$mutex = New-Object System.Threading.Mutex($false, 'ERP_SalesManagement_Watchdog_Mutex')
if (-not $mutex.WaitOne(0)) { exit 0 }

function PortUp([int]$port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

# Prefer the dev-machine PHP 8.3+ build (Laravel 13 refuses < 8.3). XAMPP's
# bundled `php` on PATH is 8.0 and would crash the helper/app it restarts.
$php84 = 'C:\xampp\php84\php.exe'
if (Test-Path -LiteralPath $php84) {
    $php = $php84
} else {
    $php = (Get-Command php -ErrorAction SilentlyContinue).Source
}
$script:funnelTick = 0
$script:funnelFail = 0

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

        # 3. Keep the public order page reachable. `tailscale funnel status` is
        #    NOT enough - it can print "Funnel on" while the public ingress
        #    backhaul is dead (2026-09-07 incident). Probe the PUBLIC path via
        #    the shared health module (DoH + curl --resolve); recreate the
        #    funnel only after TWO consecutive failed probes so a single
        #    transient failure never tears down a healthy funnel. Idempotent +
        #    throttled to once a minute so the tailscale CLI is not spawned
        #    every 15s.
        if (PortUp $AppPort) {
            $script:funnelTick++
            if ($script:funnelTick -ge 4) {
                $script:funnelTick = 0
                if (Test-Path -LiteralPath $TailscaleCli) {
                    try {
                        $furl = Get-FunnelUrl
                        if ($furl -and (Test-FunnelPublicPath $furl)) {
                            $script:funnelFail = 0
                        } else {
                            $script:funnelFail++
                            if ($script:funnelFail -ge 2) {
                                if ($furl) { & $TailscaleCli funnel off 2>&1 | Out-Null }
                                & $TailscaleCli funnel --bg --yes $AppPort 2>&1 | Out-Null
                                $script:funnelFail = 0
                            }
                        }
                    } catch {
                        # tailscale busy / probe error - next minute will retry
                    }
                }
            }
        }
    } catch {
        # never let the loop die on a transient error
    }
    Start-Sleep -Seconds 15
}
