# share-public-order.ps1
# Exposes the public order page (/portal/{company-slug}/order) to the
# INTERNET through Tailscale Funnel. No domain, no port-forwarding, no extra
# software: Tailscale terminates TLS and proxies the public ts.net URL to the
# local app server. The URL is PERMANENT - it does not change between runs.
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File share-public-order.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

# Machine-specific settings. On a NEW PC copy
# share-public-order.config.example.ps1 -> share-public-order.config.ps1
# and fill in that PC's values; the scripts load it automatically below.
$TailscaleCli = 'C:\Program Files\Tailscale\tailscale.exe'
$AppPort = 8000
$configPath = Join-Path $Root 'share-public-order.config.ps1'
if (Test-Path -LiteralPath $configPath) { . $configPath }

function Test-Port([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Ensure-Server {
    if (Test-Port $AppPort) { return }
    Write-Host "Starting Laravel server on port $AppPort..." -ForegroundColor Yellow
    $php = (Get-Command php -ErrorAction Stop).Source
    Start-Process -FilePath $php -ArgumentList @('artisan','serve','--host=0.0.0.0',"--port=$AppPort") `
        -WorkingDirectory $Root -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(60)
    while (-not (Test-Port $AppPort)) {
        if ((Get-Date) -gt $deadline) {
            Write-Host "The server did not start on port $AppPort." -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host 'Server is up.' -ForegroundColor Green
}

# Shared funnel helpers (Get-FunnelUrl, Test-FunnelPublicPath). The health check
# MUST probe the PUBLIC ingress (DoH + curl --resolve), never the local tailnet
# path: `tailscale funnel status` can print "Funnel on" while the public ingress
# backhaul is dead (2026-09-07 incident), and on this PC the ts.net name
# resolves to the 100.x tailnet IP for local requests.
$funnelHealth = Join-Path $Root 'server-helper\funnel-health.ps1'
if (Test-Path -LiteralPath $funnelHealth) { . $funnelHealth }

function Ensure-Funnel {
    if (-not (Test-Path -LiteralPath $TailscaleCli)) {
        Write-Host 'Tailscale not found. Install it from https://tailscale.com/download and sign in, then run this again.' -ForegroundColor Red
        exit 1
    }
    $url = Get-FunnelUrl
    if ($url) {
        if (Test-FunnelPublicPath $url) {
            Write-Host 'Tailscale Funnel is active and the public path responds.' -ForegroundColor Green
            return
        }
        Write-Host 'Funnel reports active but the public path is NOT responding (stale ingress). Recreating it...' -ForegroundColor Yellow
        & $TailscaleCli funnel off | Out-Null
    }
    Write-Host "Enabling Tailscale Funnel on port $AppPort..." -ForegroundColor Yellow
    & $TailscaleCli funnel --bg --yes $AppPort | Out-Null
    $deadline = (Get-Date).AddSeconds(60)
    while (-not (Get-FunnelUrl)) {
        if ((Get-Date) -gt $deadline) {
            Write-Host 'Funnel did not start. Run  tailscale funnel 8000  manually to see the error.' -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Milliseconds 500
    }
    $newUrl = Get-FunnelUrl
    if ($newUrl -and -not (Test-FunnelPublicPath $newUrl)) {
        Write-Host 'Funnel enabled; the public path may take up to a minute to propagate.' -ForegroundColor Yellow
    }
    Write-Host 'Funnel enabled.' -ForegroundColor Green
}

function Get-CompanySlugs {
    $json = & php artisan tinker --execute="echo \App\Models\Company::orderBy('id')->get(['id','name','slug'])->toJson();" 2>$null
    if (-not $json) { return @() }
    try { return @($json | ConvertFrom-Json) } catch { return @() }
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  ERP Sales Management - Share the Public Order Page' -ForegroundColor Cyan
Write-Host '  (Tailscale Funnel - permanent URL, no domain needed)' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

Ensure-Server
Ensure-Funnel

$url = Get-FunnelUrl
Write-Host ''
Write-Host '  >>> PUBLIC URL (permanent, HTTPS) <<<' -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Green
Write-Host ''
Write-Host '  Customer order links (send these to your customers):' -ForegroundColor White
foreach ($c in (Get-CompanySlugs)) {
    Write-Host "    [$($c.name)]  $url/portal/$($c.slug)/order" -ForegroundColor Cyan
}
Write-Host ''
Write-Host '  The link stays online 24/7 while this PC is on and Tailscale is' -ForegroundColor Yellow
Write-Host '  running. To stop sharing:  tailscale funnel --https=443 off' -ForegroundColor Yellow
Write-Host ''
