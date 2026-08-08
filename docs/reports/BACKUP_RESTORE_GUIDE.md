# BACKUP & RESTORE GUIDE — «النسخ الاحتياطي والاستعادة»

> Status: **2026-08-08** — feature shipped (upgrade 2, tasks 2.1–2.4) and **E2E-tested**
> (task 2.5): create → mutate → restore → verify returned the database exactly.
> Exact commands and the verified procedure are below.

---

## 1. What gets backed up

The **active database connection only** (`.env DB_CONNECTION`):

| Driver | Backup method |
|--------|---------------|
| `sqlite` (dev) | `VACUUM INTO` on the PDO connection — a **consistent snapshot** even while the app is being written to. Needs only `pdo_sqlite`. |
| `mysql` (prod) | `mysqldump` (`--single-transaction --routines`) when a client is configured, else a dependency-free PDO dump. |

Backup contents: every table (users, companies, products, parties, documents, settings, …) as
of the snapshot moment. Uploaded media (product images) and logs are **not** included.

## 2. Where backups live + naming

- Directory: `storage/app/backups`
- Filename: `backup-YYYY-MM-DD-HHMMSS[-label].{sqlite|sql}` → gzipped → `….gz` → optional
  `….enc` (AES-256-GCM). A `.sha256` sidecar is always written next to the file.

```
backup-2026-08-08-182336.sqlite.gz            # plain gzipped sqlite
backup-2026-08-08-182336.sqlite.gz.sha256     # checksum (verify uses this)
backup-2026-08-08-183000-sqlite.sql.gz.enc    # encrypted (config backup.encrypt = true)
```

## 3. Automatic schedule

Registered in `routes/console.php` — run the single scheduler entry:

```powershell
php artisan schedule:run
```

| When | Command | Retention |
|------|---------|-----------|
| Daily at **03:00** | `app:backup` | keep 7 |
| Weekly (Sunday) at **03:15** | `app:backup --weekly` | keep 7 |

On a Windows dev box wire `schedule:run` to the Task Scheduler (or the existing
`server-helper` watchdog pattern); on prod add the usual `* * * * *` cron row. If the scheduler
is NOT running, nothing is created — the Settings UI «إنشاء نسخة الآن» button is the manual fallback.

## 4. Creating a backup

**CLI:**
```powershell
php artisan app:backup                                # default name + retention
php artisan app:backup --label=before-upgrade         # backup-…-before-upgrade.sqlite.gz
php artisan app:backup --keep=30                      # override the retention cap
```

**Settings UI:** الإعدادات ← «النسخ الاحتياطي» ← «إنشاء نسخة الآن» (optional label). The new
file appears instantly in the list with size / date / driver / encrypted badges.

## 5. Listing + verifying

```powershell
php artisan app:restore --file=                  # (no value) prints the available backups
```

**Verify a file before trusting it** (also runs automatically inside every restore):

| Path | What it checks |
|------|----------------|
| CLI | `app:restore` calls `verify()` and refuses to proceed on a mismatch |
| UI | «تحقق» button → 200 `{ok:true, hash}` or a `BACKUP_CORRUPT` 422 |
| API | `POST …/backups/{file}/verify` |

Verification = sha256 of the file vs its `.sha256` sidecar (`hash_equals`). A corrupt or
tampered file is **rejected** (`BACKUP_CORRUPT`), an encrypted file that cannot be decrypted
is rejected too (`BACKUP_DECRYPT_FAILED`).

## 6. Restoring — exact procedure

> ⚠ Restoring **overwrites the current database**. Read the safety notes in §7 first.

### 6a. Via CLI (recommended for full restores)

```powershell
php artisan app:restore --file=backup-2026-08-08-182336.sqlite.gz
```

The command:
1. **Verifies** the sha256 checksum — a corrupt file aborts here.
2. Prints file / size / sha256 and asks `This will OVERWRITE the current database… Continue?`
   (default **no**). `--yes` skips the prompt for scripting.
3. **Before touching anything**, creates a fresh safety backup of the current DB
   (`backup-…-pre-restore.sqlite.gz`).
4. Replaces the live DB file (SQLite: disconnect → copy current to
   `database.sqlite.before-restore-<ts>` → copy the backup over → drop `-wal`/`-shm`).
5. Flushes the application cache + config (settings are `Cache::remember`-backed, so a restored
   DB must invalidate them).

### 6b. Via Settings UI

الإعدادات ← «النسخ الاحتياطي» ← «استعادة» on the wanted file → confirm the dialog → the app
reloads. Same backend path (`POST …/backups/{file}/restore`, `confirmed` gate).

### 6c. Automated / scripted restore

```powershell
php artisan app:restore --file=backup-….gz --yes
```

The auto `pre-restore` safety backup makes this reversible even in CI.

## 7. Safety nets (why a restore is reversible)

| Layer | Where | Purpose |
|-------|-------|---------|
| Auto safety backup | `storage/app/backups/backup-…-pre-restore.sqlite.gz` | full backup of the CURRENT DB taken right before every restore |
| Local copy | `database/database.sqlite.before-restore-<ts>` | raw file copy kept alongside the DB (SQLite only) |
| Verify gate | before anything | corrupt/tampered file never reaches the copy step |

So the worst case of a "bad restore" is a **one-command rollback**: restore again from the
`pre-restore` backup — your old data is still on disk.

## 8. Retention

`config/backup.php` (defaults: `retention_keep = 20`, `retention_days = 14`; the schedule passes
`keep = 7`). `prune()` after each backup: keep the N most recent, and — only when more than N
exist — drop files older than `retention_days`. A `keep <= 0` value is floored to the default so
a bad argument can never wipe the archive. `.sha256` sidecars are always deleted with their file.

## 9. Encryption

Enabled by `backup.encrypt = true` (default off). Uses PHP OpenSSL **AES-256-GCM**, random
12-byte IV per file, header `DZB1` + iv + tag. The key is `backup.encryption_key` falling back
to `app.key` (`base64:` prefix handled, padded/truncated to 32 bytes). Encrypted files are
`.enc`; restore decrypts → gunzips → applies. **Keep the key safe** — a backup whose key is lost
cannot be restored.

## 10. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Backup file not found` (404 / `BACKUP_NOT_FOUND`) | Wrong name or already pruned — list with `app:restore --file=` or the UI. |
| `Missing checksum …` | `.sha256` sidecar deleted or never written — re-run backup; do not hand-craft files. |
| `Checksum mismatch … corrupt or tampered` (`BACKUP_CORRUPT`) | File was edited/truncated after backup. Restore is refused — correct behavior. |
| `Decryption failed (wrong key or corrupt file)` (`BACKUP_DECRYPT_FAILED`) | `backup.encryption_key` / `APP_KEY` changed since the backup was made. |
| `SQLite database not found at …` | `.env` points elsewhere, or `database/` missing. |
| Restore while the app runs | **Works** (verified) — SQLite file copy under a live server is fine; the app reconnects on the next request. For MySQL, stop writers first (import replaces the DB). |

## 11. E2E verification run (2026-08-08)

Performed on the live dev DB (company 1 «El Houda Emballage», server running on :8000):

| Step | Command / action | Result |
|------|------------------|--------|
| Baseline | snapshot table counts + company-1 name | companies 1 · users 2 · products 983 · parties 12 · documents 326 · settings 134 |
| Backup | `php artisan app:backup --label=e2e-restore-test` | `backup-…-182815-e2e-restore-test.sqlite.gz` (659.7 KB, sha256 `cd34bf09…`) |
| Mutate | INSERT sentinel company (id 2) + rename company 1 → «… [MUTATED]» | confirmed mutated (companies 2) |
| Restore | `php artisan app:restore --file=… --yes` | safety backup created, DB replaced, cache flushed |
| Verify | re-run baseline snapshot + sentinel lookup | **all counts identical**; company-1 name reverted to «El Houda Emballage»; `sentinel_rows=0` |
| Live server | `GET /api/v1/health` + products list | 200 / 200 (981 active products) |
| Cleanup | delete e2e backup + pre-restore snapshot + before-restore copy | archive left with only the user's real backups |

### Known data-quality note (NOT a restore defect)

`php artisan documents:integrity-scan` flags **15 historical POS documents** (ids 33–177) where
`commercial_documents.total_discount` stores the **per-unit** discount sum (e.g. 1.68) instead of
`Σ total_discount_amount` (e.g. 15.12) — the pre-Phase-25 defect class documented in Phase 52.
These violations were **present in the live DB before the backup** (the E2E mutation touched only
`companies`) and were reproduced faithfully by the restore — proof the round-trip is exact. They
do not block restore and are not introduced by it. A future task may re-run the Phase 52-style
repair (`total_discount = round(Σ lines.total_discount_amount, 2)` via `saveQuietly`) on these 15.
