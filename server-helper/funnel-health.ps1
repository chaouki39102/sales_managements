# server-helper/funnel-health.ps1
# Shared Tailscale Funnel health helpers, dot-sourced by both
# share-public-order.ps1 and server-helper/watchdog.ps1 (the two scripts must
# never diverge on "is the funnel healthy?" - see the 2026-09-07 incident:
# `tailscale funnel status` printed "Funnel on" while the PUBLIC ingress
# backhaul was dead, so a status-only guard cannot detect an outage).
#
# The probe MUST go through the PUBLIC ingress, never the MagicDNS tailnet IP
# (100.x): from this PC `https://<machine>.<tailnet>.ts.net` resolves straight
# to the 100.x tailnet address, and that path still answers 200 while the
# public path is down. Strategy:
#   1. resolve the ts.net name over DNS-over-HTTPS (bypasses MagicDNS) to get
#      the PUBLIC A records - Tailscale's ingress edge IPs (176.58.90.x);
#   2. verify HTTPS on each ingress IP with `curl --resolve host:443:<ip>`
#      (SNI + Host stay the real ts.net name, the connection is the ingress).
#
# Expects $script:TailscaleCli to be set by the caller (script scope).

function Get-FunnelUrl {
    if (-not $script:TailscaleCli) { return $null }
    $out = & $script:TailscaleCli funnel status 2>&1 | Out-String
    if ($out -match 'https://[a-zA-Z0-9\-\.]+\.ts\.net') { return $matches[0] }
    return $null
}

function Resolve-PublicIngressIps {
    param([string]$HostName)
    $ips = @()
    foreach ($doh in @('https://cloudflare-dns.com/dns-query', 'https://1.1.1.1/dns-query', 'https://dns.google/resolve')) {
        try {
            $r = Invoke-RestMethod -Uri "${doh}?name=$HostName&type=A" `
                -Headers @{ Accept = 'application/dns-json' } -TimeoutSec 8
            foreach ($a in $r.Answer) {
                if ($a.type -eq 1 -and $a.data -match '^\d+\.\d+\.\d+\.\d+$') { $ips += $a.data }
            }
            if ($ips.Count) { break }
        } catch {
            # try the next DoH resolver
        }
    }
    return @($ips | Select-Object -Unique)
}

# Returns $true when the funnel's PUBLIC path answers over HTTPS. $false means
# the ingress backhaul is stale or the funnel is off - the caller should
# recreate it (`tailscale funnel off` + `funnel --bg --yes <port>`).
function Test-FunnelPublicPath {
    param([string]$Url)
    try { $hostName = ([uri]$Url).Host } catch { return $false }
    if (-not $hostName) { return $false }

    $ingress = @(Resolve-PublicIngressIps $hostName)

    if (-not $ingress) {
        # DoH unavailable (PC offline / resolver blocked). Fall back to a plain
        # probe - weaker (MagicDNS 100.x tailnet path) but it still catches a
        # fully-dead server, and - importantly - returns $true in the "whole
        # internet is down" case so callers do NOT tear down a healthy funnel
        # just because the PC lost connectivity.
        try {
            $null = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        } catch { }
        return $true
    }

    # curl ships with Windows 10/11. --output NUL keeps the body off the screen;
    # --write-out '%{http_code}' yields the status on stdout. ANY HTTP status
    # (>000) proves ingress + backhaul reach the app; only 000 (connect/TLS
    # failure) means unhealthy.
    foreach ($ip in $ingress) {
        try {
            $code = (& curl.exe --silent --output NUL --write-out '%{http_code}' `
                --connect-timeout 8 --max-time 12 --resolve "${hostName}:443:${ip}" "https://${hostName}/" 2>$null)
            $n = 0
            if ([int]::TryParse((($code | Out-String).Trim()), [ref]$n) -and $n -gt 0) { return $true }
        } catch {
            # keep scanning the other ingress IPs
        }
    }
    return $false
}