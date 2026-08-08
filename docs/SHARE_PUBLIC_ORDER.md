# Share the Public Order Page over the Internet (Tailscale Funnel)

Customers can place portal orders from **anywhere on the internet** using a
permanent HTTPS link — no domain name, no router port-forwarding, no monthly
tunnel service. This is done with **Tailscale Funnel**: Tailscale runs on the
PC, terminates TLS, and proxies the public `https://<machine>.<tailnet>.ts.net`
URL to the local Laravel server (`php artisan serve` on port 8000).

## The public links

```
Base URL (permanent):
  https://<your-machine>.<your-tailnet>.ts.net

Customer order page (per company):
  https://<your-machine>.<your-tailnet>.ts.net/portal/<company-slug>/order
```

The URL is **stable across reboots** — it never changes. It is live whenever
the PC is on, the Laravel server is up, and Tailscale is running and signed in.

---

## How it works

```
Customer  ──HTTPS──▶  https://desktop-abc.tailXXXX.ts.net
                          │  Tailscale Funnel (TLS termination)
                          ▼
                     127.0.0.1:8000  (php artisan serve)
                          │
                          ▼
                    Laravel app + portal public order API
```

- Funnel config is stored inside Tailscale, so it survives reboots.
- The **watchdog** (`server-helper/watchdog.ps1`) keeps the servers alive and
  re-enables the Funnel every minute if it ever drops (idempotent).
- `bootstrap/app.php` already trusts the tunnel proxy (`trustProxies`) so
  generated URLs are correct.

---

## First-time setup (do this once on ANY PC)

### 1. Install + sign in to Tailscale

Install from <https://tailscale.com/download>, then sign in with the tailnet
account. Verify it is connected:

```
tailscale status
```

Your machine must appear as a node of the tailnet (e.g. `100.114.4.71 desktop-h8shjo5`).

### 2. Find your public hostname

```
tailscale status
```

Your public URL is:

```
https://<your-machine-name>.<your-tailnet>.ts.net
```

> Example from THIS PC: machine `desktop-h8shjo5`, tailnet `tailc6ab98` →
> `https://desktop-h8shjo5.tailc6ab98.ts.net`
>
> The OTHER PC uses its own tailnet (`taila9b3bd`) — each machine/account has
> its own `<machine>.<tailnet>.ts.net`; never reuse this PC's URL there.

### 3. Create the machine config (fill in this PC's values)

The repo ships a template (committed). On each PC, create your private copy:

```
copy share-public-order.config.example.ps1  share-public-order.config.ps1
```

Open `share-public-order.config.ps1` and fill in:

| Setting | What to put | How to find it |
|---|---|---|
| `$TailscaleCli` | Path to `tailscale.exe` | Default `C:\Program Files\Tailscale\tailscale.exe`; or `(Get-Command tailscale).Source` |
| `$AppPort` | Laravel port | Default `8000` (leave as-is) |
| `$PublicHostname` | `https://<machine>.<tailnet>.ts.net` | `tailscale status` (informational only) |

The real `share-public-order.config.ps1` is **gitignored** — each PC keeps its
own private copy and never overwrites the other PC's settings. If the file is
missing, the scripts fall back to the default Tailscale path.

### 4. Start sharing

Double-click `share-public-order.bat` (or run the `.ps1`). It will:

1. Start the Laravel server on port 8000 if it is down.
2. Enable Tailscale Funnel (background) if it is off.
3. Print the public URL + the order link for every company.

```
>>> PUBLIC URL (permanent, HTTPS) <<<
https://desktop-h8shjo5.tailc6ab98.ts.net

Customer order links (send these to your customers):
    [EL-HOUDA EMBALLAGE]  https://desktop-h8shjo5.tailc6ab98.ts.net/portal/el-houda-emballage-6a5e589dc1cfe/order
    [<COMPANY 2 NAME>]    https://desktop-h8shjo5.tailc6ab98.ts.net/portal/<company-2-slug>/order
```

### 5. Send the order links to your customers

Customers open the link on any phone/browser and place an order as a guest
(no account needed). Orders appear in the admin panel under **طلبات البوابة**
(Portal Orders).

---

## Cross-PC workflow (push on one PC → pull on another)

1. **On the new PC**: `git pull` — you will get `share-public-order.config.example.ps1`
   and this guide. The real `share-public-order.config.ps1` will **not** come
   from git (it is machine-specific and gitignored).
2. Copy the `.example` → real config and fill in that PC's Tailscale path +
   hostname (step 3 above).
3. Install Tailscale on that PC and sign in (step 1).
4. Run `share-public-order.bat` — the new PC now has **its own** public URL.
   Send customers the new link.
5. Optional: run `register-autostart.ps1` once so the servers auto-start at
   logon on that PC too (creates the `ERP-ServerHelper` scheduled task or a
   Startup VBS; the watchdog then self-heals everything, including Funnel).

> Each PC = its own public hostname. You cannot share one hostname from two
> PCs — Tailscale gives every machine its own `<machine>.<tailnet>.ts.net`.

---

## Verify it works

Run these on the sharing PC (or any internet device):

```
curl https://<your-machine>.<your-tailnet>.ts.net/                    → 200 HTML
curl https://<your-machine>.<your-tailnet>.ts.net/portal/<slug>/order → 200 HTML
curl https://<your-machine>.<your-tailnet>.ts.net/api/v1/<slug>/portal/orders/catalog
```

A successful HTTPS request also proves the TLS certificate is valid.

---

## Manage / stop sharing

```
tailscale funnel status          # show current funnel config
tailscale funnel --https=443 off # STOP sharing publicly (page goes offline)
tailscale funnel 8000            # start again (foreground)
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Tailscale not found` | Not installed or not in PATH — install from tailscale.com and sign in. |
| `Funnel did not start` | Run `tailscale funnel 8000` manually to see the exact error (most often: not signed in, or HTTPS not yet provisioned — Funnel auto-provisions the Let's Encrypt cert on first use). |
| Page offline after reboot | The watchdog re-enables Funnel within ~60s (only when the app server is up). Wait one minute, or run `share-public-order.bat`. |
| `ERR_CONNECTION_REFUSED` | The Laravel server is down — the watchdog/helper should restart it within ~20s (see `status.html` or `http://localhost:8777`). |
| Port 8000 busy | Another process holds it; stop it or change `$AppPort` (and the `--port` in `start-helper.ps1`) consistently. |
| New PC still shows old URL | Each machine has its own hostname. After `git pull` on the new PC, fill the config and run the script — do not reuse this PC's URL. |

---

## Files involved

| File | Purpose |
|---|---|
| `share-public-order.ps1` | Main script: ensure server → enable Funnel → print public links. Reads the machine config. |
| `share-public-order.bat` | Double-clickable wrapper. |
| `share-public-order.config.example.ps1` | **Committed template** — copy to the real config on each PC. |
| `share-public-order.config.ps1` | **Machine-specific, gitignored** — filled in per PC. |
| `server-helper/start-helper.ps1` | Hidden launcher for helper (8777) + app (8000) + watchdog. |
| `server-helper/watchdog.ps1` | Self-healing loop: keeps 8777/8000 up, re-enables Funnel every minute. |
| `register-autostart.ps1` | Registers the logon autostart (scheduled task or Startup VBS). |
| `bootstrap/app.php` | `trustProxies` — makes Laravel trust the tunnel proxy. |
