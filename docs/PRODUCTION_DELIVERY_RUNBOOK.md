# Production Delivery Runbook

How to install, launch, maintain, back up and expose **Sales Management (ERP)** on a
Windows machine. It's a Laravel 13 (PHP ^8.3) + React 18 PWA (Vite) single-app
deployment. This machine is the server: everything runs locally on ports `8000`
(app) and `8777` (control helper).

> The launcher scripts, watchdog and Tailscale funnel are already in the repo —
> this runbook only documents how to use them. You don't need Apache or a real
> web server.

---

## 1. Ports & components

| Component | Port | Entry | Notes |
|-----------|------|-------|-------|
| Main app (Laravel `artisan serve`) | 8000 | `http://localhost:8000` · `http://<LAN-IP>:8000` | Serves the SPA + API |
| Control helper (`server-helper/router.php`) | 8777 | `http://localhost:8777` (→ `status.html`) | Diagnose/start/stop/restart, serves the status page, watches ports |
| Watchdog | — | `server-helper/watchdog.ps1` | Restarts helper/app automatically, re-enables Tailscale funnel |
| Tailscale Funnel (public) | 443 | `https://<machine>.<tailnet>.ts.net/portal/<slug>/order` | Public customer order page, TLS, no port-forward |

### The serving chain (how it stays up)

```
Windows logon (Scheduled task "ERP-ServerHelper" or Startup VBS)
        │  hidden powershell
        ▼
server-helper\start-helper.ps1        (idempotent - starts only what is down)
        │
        ├── php -S 0.0.0.0:8777 server-helper\router.php   → control helper
        └── php artisan serve --host=0.0.0.0 --port=8000   → the app
        │
        └── spawns server-helper\watchdog.ps1  (forever loop, ~15s tick)
                ├── helper (8777) down  → relaunch helper
                ├── app (8000) down     → ask helper /api/status (auto-starts app),
                │                         unless user stopped it manually
                └── funnel unhealthy    → re-run `tailscale funnel` (after 2 failed probes)
```

- `artisan serve` on this setup is fine for production use here (LAN + tailnet +
  Funnel share the same built-in server on 8000). No Apache/Nginx required.
- SQLite runs in **WAL mode** (`config/database.php`) — do not switch it off.

---

## 2. Prerequisites (one machine, Windows)

- **PHP 8.3+** — in practice **PHP 8.4.24 at `C:\xampp\php84\php.exe`** (XAMPP's
  bundled PHP 8.0 is NOT compatible and must never be used). All scripts resolve
  PHP with this preference, then fall back to `php` from PATH.
- **Composer** (aligned to the same PHP 8.3+ interpreter).
- **Node.js + npm** (for `vite` build/PWA).
- **Tailscale** installed (`C:\Program Files\Tailscale\tailscale.exe`) — only if
  you need the public order page.
- No database server needed for the default **SQLite** setup.

---

## 3. First-time install

```bat
git clone <repo-url> sales-management
cd sales-management
php -r "copy('.env.example', '.env');"        :: or composer setup does it
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=DatabaseSeeder    :: global data + super-admin (idempotent)
npm install --ignore-scripts
npm run build
```

`composer run setup` is a shortcut that runs most of the above: `composer install`
→ copies `.env` → `key:generate` → `migrate --force` → `npm install --ignore-scripts`
→ `npm run build`.

> If `database\database.sqlite` doesn't exist, `start-server.bat` creates it for
> you before migrating; `migrate --force` then builds the schema.

### Super-admin account

Created by `UserSeeder` (inside `DatabaseSeeder`), read from `.env`:

```
SUPER_ADMIN_EMAIL=admin@mail.com
SUPER_ADMIN_PASSWORD=password
SUPER_ADMIN_NAME=Super Admin
```

Set these in `.env` **before** seeding. The seeder uses `firstOrCreate`, so
re-running does not reset the password.

### Data seeding model (important)

- `DatabaseSeeder` → `GlobalSeeder` (wilayas/communes, super-admin user, global
  roles+permissions, system-wide settings) + `PlanSeeder`, then per-company
  document conversions + roles, then print templates.
- **Company data is seeded automatically when a company is created** in the UI
  (`CompanyObserver::created` → `CompanySeeder`): currencies, TVA rates, units,
  warehouses, roles, fiscal year + all settings via `SettingsSeeder` → `seedForCompany()`.
- Re-running `php artisan db:seed --class=DatabaseSeeder` is idempotent and safe
  for existing companies.

---

## 4. Build the frontend

```bat
npm install --ignore-scripts
npm run build
```

- Output goes to `public/build/`, plus a **service worker**.
- After EVERY build, verify the root SW is in sync with the build output:

```powershell
(Get-FileHash public\sw.js).Hash -eq (Get-FileHash public\build\sw.js).Hash   # must be True
```

  (a `copy-sw-to-root` Vite hook refreshes `public/sw.js`; if it doesn't match,
  the browser keeps serving the old assets forever.)

- Do **not** commit `public/build/` (untracked) — commit `public/sw.js`.

---

## 5. Launch

### Normal launch: `start-server.bat`

```bat
start-server.bat
```

1. Validates PHP ≥ 8.3 (prefers `C:\xampp\php84\php.exe`, hard-fails otherwise).
2. Creates `database\database.sqlite` if missing.
3. `php artisan migrate --force` (no-op when already applied).
4. `php artisan optimize:clear`.
5. Starts the control helper on 8777 (minimized window).
6. Runs the main server on 8000 (foreground; Ctrl+C stops it).

Next steps: open `http://localhost:8000` (app) or `http://localhost:8777`
(diagnostics/start-stop page `status.html`).

### Always-on (recommended for production): autostart at logon

```powershell
powershell -ExecutionPolicy Bypass -File register-autostart.ps1
```

- Registers a hidden Scheduled Task **`ERP-ServerHelper`** that runs at logon
  (falls back to a hidden Startup-folder VBS if elevation is denied).
- It then launches `server-helper\start-helper.ps1` immediately — helper 8777 +
  app 8000 come up on their own at every logon.
- The **watchdog** keeps them alive: if the app dies it comes back within ~15s;
  a manually-stopped server stays stopped (`/api/status` "stopped" state) until
  you start it again.
- Uninstall: `Unregister-ScheduledTask -TaskName 'ERP-ServerHelper' -Confirm:$false`
  (and/or delete the startup VBS).

### Development mode: `start-dev.bat`

Opens two consoles: `php artisan serve` (8000) and `npm run dev` (Vite HMR).
Use for development only — the production launch is `start-server.bat`.

---

## 6. Health & diagnostics

- **`http://localhost:8777`** — `status.html` (Arabic RTL): banner (ok/warn/fail),
  start/stop/restart buttons, per-check cards (PHP version, extensions, APP_KEY,
  sqlite file, migrations, storage writable, build manifest, app server), and a
  "helper down" recovery card (run `start-server.bat` or `start-helper.ps1`).
- **`GET http://localhost:8000/api/v1/health`** — app-level health JSON
  (`status`, database, php_version, migrations, `checks[]` + `problem`).
- The helper's `/api/status` also returns the root-cause `problem` for the status
  page and is what the watchdog polls.

---

## 7. Backups

Backup are produced with the `app:backup` artisan command.

Commands:
```bat
php artisan app:backup                 :: SQLite → storage\app\backups, gzip + sha256
php artisan app:backup --label=weekly  :: weekly-labelled backup
php artisan app:restore <backup file>  :: VACUUM INTO/SQLite3::backup (WAL-safe)
```

Scheduling (already in `routes/console.php`):
- Daily at 03:00 (`app:backup`, keep 7).
- Weekly Sunday 03:15 (`app:backup --label=weekly`, keep 7).

Run the scheduler:
```bat
php artisan schedule:work     :: Windows: always-on console window (recommended)
```
(Linux note in `routes/console.php` uses `php artisan schedule:run` every minute.)

Backup files: `storage\app\backups\backup-YYYY-MM-DD-HHMMSS[-weekly].sqlite`
→ `.gz` → optional `.enc` (AES-256-GCM) → always a `.sha256` sidecar. Media
files are not included. See `docs\reports\BACKUP_RESTORE_GUIDE.md` for the full
guide (restore flow, retention, WAL checkpoint notes).

---

## 8. Public order page (Tailscale Funnel)

The customer order page is reachable publicly via a stable HTTPS URL:

```
https://<machine>.<tailnet>.ts.net/portal/<company-slug>/order
```

Setup / maintenance:
- `share-public-order.ps1` / `share-public-order.bat` — checks the funnel;
  enables it with `tailscale funnel --bg --yes 8000` if needed; prints the public
  URL + per-company order links.
- Per-machine config template: `share-public-order.config.example.ps1` (copy to
  `share-public-order.config.ps1`, gitignored, and fill in your Tailscale CLI
  path / hostname). Each PC has its own `<machine>.<tailnet>.ts.net` hostname —
  never reuse another PC's URL.
- The watchdog probes the **public** path every minute (via `funnel-health.ps1`,
  DoH + `curl --resolve`) and recreates the funnel only after **two** consecutive
  failed probes, so a flaky check never tears down a healthy funnel.
- First time on a new tailnet: enable Funnel for the node at the Tailscale admin
  console (one-time action).

Full details + troubleshooting in `docs\SHARE_PUBLIC_ORDER.md`.

---

## 9. Updating an existing installation

```bat
git pull
php artisan migrate --force
php artisan db:seed --class=DatabaseSeeder     :: idempotent - new global/per-company rows
php artisan cache:clear                        :: settings are cache-backed (24h)
npm install --ignore-scripts
npm run build
powershell -ExecutionPolicy Bypass -File register-autostart.ps1   :: ensures autostart still registered
start-server.bat
```

### Critical: new settings added by `SettingsSeeder`

If a release adds settings in `SettingsSeeder::seedForCompany()` you MUST re-run it,
otherwise the new setting does not exist:

```bat
php artisan db:seed --class=SettingsSeeder
php artisan cache:clear
```

`settings` reads are `Cache::remember`-backed (24h, key `setting:{companyId}:{key}`),
so skipping either step = "new setting is missing / returns the old value".
`seedForCompany()` uses `DB::table(...)->updateOrInsert(...)` and fires no events —
the seed must be run manually.

---

## 10. Troubleshooting quick reference

| Symptom | Cause / fix |
|---------|-------------|
| `PHP 8.3+ needed` / Laravel won't boot | `php` resolving to XAMPP's PHP 8.0. Use `C:\xampp\php84\php.exe` (or add it to PATH). |
| `General error: 14 unable to open database file` (SQLite) | WAL mode retains `-wal`/`-shm`; do NOT switch back to delete-journal mode. Restore is WAL-safe via `app:restore`. |
| Browser still shows an old build | Stale service worker → `public\sw.js` not refreshed by build. Rebuild and verify SW MATCH (section 4). |
| `tailscale funnel status` says "Funnel on" but page unreachable | Status only proves local config. Watchdog probes the PUBLIC path and self-heals after 2 failures; otherwise re-run `share-public-order.ps1`. |
| App down but no console | Watchdog auto-restarts within ~15s; check `http://localhost:8777` → `/api/status` for root cause. |
| Port 8000 already in use | Something else owns it; stop it (helper `إيقاف` button) or free the port. |
| Helper itself unresponsive on 8777 | Run `start-server.bat` (or `server-helper\start-helper.ps1`); `status.html` shows the recovery steps. |

---

## 11. Quick reference: files that matter

| File | Role |
|------|------|
| `start-server.bat` | Production launcher (migrate + optimize + helper 8777 + app 8000) |
| `start-dev.bat` | Dev launcher (artisan serve + Vite) |
| `server-helper\router.php` | Control helper on 8777 (status endpoints + start/stop/restart) |
| `server-helper\start-helper.ps1` | Idempotent launcher (helper + app), used by autostart |
| `server-helper\watchdog.ps1` | Forever-loop supervisor (app + helper + funnel) |
| `server-helper\funnel-health.ps1` | Shared "is the public funnel healthy?" probe |
| `register-autostart.ps1` | Register logon autostart (task + VBS fallback) |
| `status.html` | Standalone Arabic diagnostic/control page (served by helper) |
| `share-public-order.ps1` / `.bat` / `.config.example.ps1` | Tailscale funnel enable + verify |
| `docs\SHARE_PUBLIC_ORDER.md` | Funnel full guide |
| `docs\reports\BACKUP_RESTORE_GUIDE.md` | Backup/restore full guide |
| `routes\console.php` | Backup schedule (daily 03:00, weekly Sun 03:15) |