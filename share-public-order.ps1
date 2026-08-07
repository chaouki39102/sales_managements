# share-public-order.ps1
# Turns this PC into a public server: exposes the public order page
# (/portal/{company-slug}/order) to the internet via a free Cloudflare quick tunnel.
# No account needed. The link stays alive only while this window is open.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$ServerPort = 8000
$ToolsDir   = Join-Path $Root 'tools'
$CfDir      = Join-Path $ToolsDir 'cloudflared'
$CfExe      = Join-Path $CfDir 'cloudflared.exe'
$LogDir     = Join-Path $Root 'storage\logs'
$CfLog      = Join-Path $LogDir 'cloudflared-tunnel.log'
$CfErr      = Join-Path $LogDir 'cloudflared-tunnel.err'

function Test-Port([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
}

function Get-Cloudflared {
    if (Test-Path $CfExe) { return }
    Write-Host 'Downloading Cloudflare tunnel client (cloudflared)...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $CfDir | Out-Null
    $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    try {
        Invoke-WebRequest -Uri $url -OutFile $CfExe -UseBasicParsing
    } catch {
        Write-Host "Failed to download cloudflared: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Download it manually and put it at: $CfExe" -ForegroundColor Yellow
        exit 1
    }
    Unblock-File $CfExe -ErrorAction SilentlyContinue
    Write-Host 'cloudflared downloaded.' -ForegroundColor Green
}

function Ensure-Server {
    if (Test-Port $ServerPort) {
        Write-Host "Server already running on port $ServerPort." -ForegroundColor Yellow
        return
    }
    Write-Host "Starting Laravel server on port $ServerPort..." -ForegroundColor Yellow
    $php = (Get-Command php -ErrorAction Stop).Source
    Start-Process -FilePath $php -ArgumentList @('artisan','serve','--host=0.0.0.0','--port=8000') `
        -WorkingDirectory $Root -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(60)
    while (-not (Test-Port $ServerPort)) {
        if ((Get-Date) -gt $deadline) {
            Write-Host "The server did not start on port $ServerPort." -ForegroundColor Red
            Write-Host 'Run `php artisan serve --host=0.0.0.0 --port=8000` manually to see the error.' -ForegroundColor Yellow
            exit 1
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host 'Server is up.' -ForegroundColor Green
}

function Get-CompanySlugs {
    $json = & php artisan tinker --execute="echo \App\Models\Company::orderBy('id')->get(['id','name','slug'])->toJson();" 2>$null
    if (-not $json) { return @() }
    try { return @($json | ConvertFrom-Json) } catch { return @() }
}

function Start-Tunnel {
    Write-Host "Starting Cloudflare quick tunnel to http://127.0.0.1:$ServerPort ..." -ForegroundColor Yellow
    foreach ($f in @($CfLog, $CfErr)) { if (Test-Path $f) { Remove-Item $f -Force } }
    $proc = Start-Process -FilePath $CfExe -ArgumentList @('tunnel','--url',"http://127.0.0.1:$ServerPort") `
        -NoNewWindow -RedirectStandardOutput $CfLog -RedirectStandardError $CfErr -PassThru
    return $proc
}

function Wait-ForUrl([int]$ProcId) {
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-Process -Id $ProcId -ErrorAction SilentlyContinue)) {
            Write-Host 'cloudflared exited unexpectedly. Log:' -ForegroundColor Red
            Get-Content $CfLog -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" }
            Get-Content $CfErr -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" }
            return $null
        }
        foreach ($f in @($CfLog, $CfErr)) {
            if (Test-Path $f) {
                $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
                if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
                    return $matches[0]
                }
            }
        }
        Start-Sleep -Milliseconds 400
    }
    Write-Host 'Timed out waiting for the tunnel URL.' -ForegroundColor Red
    return $null
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  ERP Sales Management - Share the Public Order Page' -ForegroundColor Cyan
Write-Host '  (make this PC a public server - no account needed)' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

Get-Cloudflared
Ensure-Server

$companies = Get-CompanySlugs
if (-not $companies) {
    Write-Host 'Could not read the company list from the database.' -ForegroundColor Yellow
}

$proc  = Start-Tunnel
$url   = Wait-ForUrl -ProcId $proc.Id
if (-not $url) { exit 1 }

Write-Host ''
Write-Host '  >>> TUNNEL IS LIVE - this PC is now a public server <<<' -ForegroundColor Green
Write-Host ''
Write-Host "  Local:      http://localhost:$ServerPort" -ForegroundColor Green
Write-Host "  Public:     $url" -ForegroundColor Green
Write-Host ''
Write-Host '  Customer order links (send these to your customers):' -ForegroundColor White
foreach ($c in $companies) {
    Write-Host "    [$($c.name)]  $url/portal/$($c.slug)/order" -ForegroundColor Cyan
}
if (-not $companies) {
    Write-Host "    $url/portal/YOUR-COMPANY-SLUG/order" -ForegroundColor Cyan
}
Write-Host ''
Write-Host '  Keep this window open - the link works only while it is open.' -ForegroundColor Yellow
Write-Host '  Close this window to stop sharing (the local server keeps running).' -ForegroundColor Yellow
Write-Host '  NOTE: this is a temporary link; it changes on every run.' -ForegroundColor Yellow
Write-Host '  For a permanent address you need a Cloudflare account (named tunnel).' -ForegroundColor Yellow
Write-Host ''

try {
    Wait-Process -Id $proc.Id
} catch {
    # window closed / Ctrl+C -> tunnel goes down with the console
}
