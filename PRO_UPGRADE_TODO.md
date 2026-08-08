# PRO Upgrade — Task Checklist

> **Status: ⏸ PAUSED (Aug 8) — upgrades 1 & 2 fully complete (1.1–1.5, 2.1–2.5);
> upgrade 5 (Offline-First POS) in progress: **5.1, 5.2, 5.3 done + pushed**;
> upgrades 3–4 not started.** Resume on any PC: `git pull`, open this file, and continue
> with task 5.4. Commit + push after EACH task.

> **Goal**: take the sales-management ERP (Laravel + React POS, Algerian market) from a
> working system to a professional-grade product. Five upgrades, each self-contained.

## Global verification (run after every task)

- `npx tsc --noEmit` — clean
- `npm test` — 244/244 pass (was 222; offline queue/math/sync suites added)
- `npm run build` — 0 errors
- **SW MATCH**: `(Get-FileHash public/sw.js -Algorithm SHA256).Hash` must equal
  `(Get-FileHash public/build/sw.js -Algorithm SHA256).Hash`
- `vendor\bin\pest.bat` (backend) — all pass
- Live smoke via Playwright Chromium (fresh browser, fresh token) — zero console/page errors

---

## 1. Fiscal E-Invoicing: BSC QR Code + Compliant Invoice PDF

> **Goal**: every sale document (FV/POS) carries the Algerian DGI QR code and prints/export
> a legally-compliant invoice (PDF + thermal). This is the 2024/2025 Algerian tax-reform
> requirement — the single biggest "pro" differentiator.
>
> **Context to reuse**: print engine is unified under `resources/js/pages/settings/print-settings/`
> (`UniversalPreview`, `UniversalPrintPipeline`, `DocumentDataBuilder`, `PrintFieldResolver`,
> `SettingsRegistry` — 144+ settings). Thermal goes through `ESCPOSRenderer` → `EscPosBuilder`.
> Backend doc service is `app/Services/CommercialDocumentService.php` (`beforeCreate` generates
> `document_number`; `recalculateTotals`; `TaxRuleService` handles TVA/exemption).

- [x] **1.1 Backend QR payload builder** — `app/Services/FiscalInvoiceQrService.php`: build the
      QR data string from the document (seller NIF/name, buyer NIF, invoice number, date,
      total HT, TVA, total TTC). Follow the **official DGI QR specification** (Decree 21-98 /
      current e-invoicing rules) — VERIFY field order/separators against the official spec
      before hardcoding. Add `qrcode_content` (or the fields) to the document API `toArray`.
- [x] **1.2 QR rendering** — added the `qrcode` npm lib (dynamic-imported, code-split) and a
      `FiscalQR` component; `UniversalPreview` footer (thermal/A4/A5) now renders a real QR
      `<img>` — the fiscal `qrcode_content` payload takes priority when present, legacy
      `qr_content` selection otherwise. `ESCPOSRenderer` encodes the fiscal payload (fallback
      doc number) via the existing `EscPosBuilder.qrCode()` (GS ( k Model 2). `qrcode_content`
      threaded through `DocumentInfo.qrcodeContent` + `DocumentDataBuilder.buildDocInfo`.
- [x] **1.3 Print-template setting** — added `show_qr_code` (+ `qr_code_size` slider 24–160px,
      `qr_code_align` pills) to `SettingsRegistry.ts` (`docDefaults: {FV: true}` backfilled by
      `SettingsSerializer` before the generic default) + the footer sections (form toggle +
      preview helper `qrActive()`/`qrSize()`/`qrAlignOf()`; the fiscal toggle supersedes the
      legacy `show_qr` — either enables the QR block). ESC/POS maps size (px→1–8 via /12 clamp)
      + align; `PrintFieldRegistry` `footer.qrCode`; seeder + template-library configs
      (`INVOICE_FOOTER.showQrCode=true`, others false). Default ON for FV.
- [x] **1.4 Official PDF export** — client-side PDF via the lazy `dompdf.js` chunk (WASM
      inlined base64, no server service): `runtime/exportPdf.ts` renders the SSOT
      `UniversalPreview` into an off-screen container, waits for fonts + the async fiscal QR
      data URL, then `dompdf.downloadPDF(container, {format A4/A5, orientation, useCORS})`.
      Filename = `{number}.pdf` (sanitized). Buttons on `TemplatePrintModal` (invoice detail
      + single-doc «طباعة» action) and `ProfessionalReceipt` (POS receipt). E2E
      `pdf-export.pw.spec.ts` downloads `FV-2026-000001.pdf` (%PDF- header).
- [x] **1.5 Validation** — `docs/reports/FISCAL_QR_SPEC.md` documents the chosen spec
      (versioned JSON v1 — the DGI has NOT published an official QR spec as of 2026-08-08)
      + the known-good test vector (real doc FV-2026-000001, `dataString` output verbatim).
      Scannability PROVEN with an independent decoder: `fiscal-qr-scan.spec.ts` encodes the
      vector with the app's exact options (qrcode lib, EC level M) and decodes it back with
      `jsqr` to the identical string, incl. an M-level damage-recovery test. Backend
      `FiscalInvoiceQrServiceTest` covers buildData/round-trip/validateData/svgBase64. The
      official DGI validator app is NOT RUN — DGI has not released one; re-check
      https://e-invoicing.dz before any official-schema bump.

## 2. Automated Backup + Restore

> **Goal**: scheduled, encrypted database backup with a tested one-click restore. This is
> accounting software — losing data is catastrophic, and there is currently NO protection.
>
> **Context**: `composer.json` may already have backup tooling; check before adding.
> DB is SQLite (`database/database.sqlite`) in dev, MySQL in prod (`.env DB_CONNECTION`).

- [x] **2.1 Backup command** — `php artisan app:backup` (Laravel scheduler): dump the active
      connection (`sqlite` → file copy; `mysql` → `mysqldump`/query builder), gzip, optional
      AES-256-GCM encryption, timestamped filename, retention (keep N days), write to `storage/app/backups`.
- [x] **2.2 Schedule** — `routes/console.php`: daily 03:00 (`app:backup`) + weekly Sunday 03:15
      (`app:backup --weekly`), each keeping 7 backups. `php artisan schedule:run` is the single entry.
- [x] **2.3 Restore command** — `php artisan app:restore --file=<name> --confirm`: verify the
      `DZB1` magic + per-file sha256 checksum, ask for explicit confirmation, refuse corrupt files.
- [x] **2.4 UI** — «النسخ الاحتياطي» tab in Settings (`BackupTab`): list backups (size/date/
      driver/encrypted badges), create now (optional label), download, verify, restore (ConfirmModal
      gate, auto-reload), delete old. Backend `BackupController` (index/store/verify/download/
      restore/delete) under `{company}` + `can:update_company`; `apiDownload` blob helper +
      `tenantKeys.backups` + `useBackups`/`useBackupMutations`.
- [x] **2.4b API hardening** (`37123d1`) — fixed the Laravel dispatcher positional-splice bug:
      type-hinted `Request` is spliced to position 0 in tenant routes, so the `{file}` param of
      `verify`/`download`/`restore`/`delete` received the **Company model** → all four returned
      500. Now resolve `{file}` via `resolveRouteId('file')`. Also: `keep <= 0` falls back to the
      config default (never prunes the whole archive), `prune()` re-globs before the age-cap
      (no `filemtime()` on deleted files), client sends `keep` only when explicitly positive.
      Live-verified: verify 200, download 200 (gzip), delete 200; `vendor\bin\pest.bat` 58 passed.
- [x] **2.5 Test** — E2E verified on the live dev DB (server running): baseline snapshot
      (companies 1 · users 2 · products 983 · parties 12 · documents 326 · settings 134) →
      `app:backup --label=e2e-restore-test` → INSERT sentinel company + rename company 1 →
      `app:restore --file=… --yes` → **all counts identical**, company-1 name reverted,
      sentinel gone, live server 200 on health/products. Restore auto-creates a `pre-restore`
      safety backup + keeps `database.sqlite.before-restore-<ts>`. Test artifacts cleaned up.
      Exact procedure documented in `docs/reports/BACKUP_RESTORE_GUIDE.md` (CLI + UI + scripted,
      schedule, retention, encryption, troubleshooting, E2E table). NOTE: integrity-scan flags 15
      pre-existing POS `total_discount` defects (pre-Phase-25 class) — present before the backup,
      reproduced faithfully (proves exact round-trip), NOT restore-introduced; a Phase-52-style
      repair is a possible future task.

## 3. Online Payment in the Customer Portal (EDAHABIA / CIB / CTPay)

> **Goal**: let portal customers pay orders online, turning `/portal` from "order + pay on
> delivery" into a real sales channel. Orders are currently `CMD` documents converted to `FV`
> (`PortalOrderService::convertToSale`); payments are confirmed manually
> (`PaymentSynchronizer`).
>
> **Context**: portal API lives outside `{company}` (`routes/api.php`, `portalClient` axios
> instance in `resources/js/lib/api/portal/`). Portal order lifecycle: `PortalOrderController`
> (customer) + `PortalOrdersController` (admin, convert). Payment models/checks exist
> (`resources/js/lib/api/endpoints/payments.ts`, `checks.ts`).

- [ ] **3.1 Gateway SDK** — integrate one Algerian gateway (EDAHABIA / CIB e-payment / CTPay).
      Requires a merchant account + sandbox credentials; gate behind a setting
      (`online_payment_enabled`, `gateway_mode=sandbox|live`).
- [ ] **3.2 Backend payment initiation** — new endpoint (portal + admin) creating a payment
      intent: order → amount TTC → gateway order page (redirect URL with `return` + `callback`).
      Idempotency: one intent per order.
- [ ] **3.3 Webhook/notification handler** — verify signature, mark order paid, create a
      `confirmed` payment (reuse `PaymentSynchronizer`/`syncPayments`), update status →
      paid, log in `portal_order_status_histories`.
- [ ] **3.4 Portal UI** — «الدفع الإلكتروني» button on the order detail / checkout that opens
      the gateway; success/failure result page; show "مدفوع عبر الإنترنت" on the order.
- [ ] **3.5 Security + tests** — signature verification, replay protection (intent idempotency
      key), amount must equal server-side total (never client-sent). Pest tests for
      initiate/callback/verify with forged payloads rejected.

## 4. 2FA + Granular Permissions

> **Goal**: multi-user trust — TOTP two-factor auth for users and per-role permission control.
> An audit log already exists (`DataAuditSubscriber`, Phase 40).
>
> **Context**: auth is Laravel Sanctum (`routes/api.php`, `AuthProvider` frontend). Users are
> multi-company via `company_user` pivot (the `company` middleware checks `company_user.active`).
> Check `composer.json` for `spatie/laravel-permission` before deciding.

- [ ] **4.1 TOTP 2FA** — generate a shared secret per user (e.g. `pragmarx/google2fa-laravel`
      or a JS `otplib`/`speakeasy` flow), QR enrollment screen (settings → الأمان), verify a
      6-digit code on login (`login` API now requires `2fa_code` when enabled).
- [ ] **4.2 Backend middleware** — enforce 2FA per user before granting Sanctum tokens; backup
      codes (printable, one-time) for lockout recovery.
- [ ] **4.3 Roles/permissions** — define roles (owner, manager, cashier, viewer) + permission
      matrix mapped onto existing feature flags (`can:create_sales_document` etc.).
- [ ] **4.4 Admin UI** — user settings: enable 2FA, assign role, issue backup codes; a
      permissions matrix page.
- [ ] **4.5 Tests** — login without/with 2FA, wrong code rejected, backup code flow, permission
      denial → 403.

## 5. Offline-First POS with Sync

> **Goal**: the POS keeps working with no internet and syncs when the connection returns —
> replacing the current SW-cache-only behavior.
>
> **Context**: SW precache exists (`vite.config.js`, Workbox NetworkFirst API rule).
> `resources/js/lib/offline/useOffline.ts` + `offlineAwareApi.ts` exist. Cart store:
> `useCartStore` (classic) / `usePosProCart` (Pro); "is this cart editing a document?" is the
> store's `documentId` (Phase 46 — PUT vs POST decision).

- [x] **5.1 Write queue** — IndexedDB queue (`resources/js/lib/offline/db.ts`) recording
      document creates/updates, payments, stock-changing ops with the FULL payload +
      `documentId` (replay must PUT, not POST — Phase 46 rule). `PendingOp`:
      `{id, method, url, data, tempId?, targetId?, createdAt, status:'pending'|'failed',
      retries, lastError?}`. `enqueueOp` stores method+url VERBATIM (replay never reinvents
      the HTTP verb); FIFO replay order = auto-increment `id ASC`. Helpers: `getPendingOps`,
      `getPendingOpsByStatus`, `getFailedOpsCount`, `updatePendingOp`, `markOpFailed`,
      `clearPendingOps`, `invalidateCache(prefix)`, `extractTargetIdFromUrl`. Test:
      `resources/js/lib/offline/__tests__/offline-queue.spec.ts` (6 tests, `fake-indexeddb`).
- [x] **5.2 Offline interception** — `offlineAwareApi.ts` routes POS mutations through the
      queue when `navigator.onLine === false` and returns a RICH optimistic success so the
      sale completes offline: `{id: <temp>, document_number: 'OFFLINE-<n>', total_ht/tva/ttc,
      net_to_pay, paid_amount, balance_data:{previous_balance:null,new_balance:null},
      _offline:true}` (HTTP 202). GETs serve the 5-min IndexedDB cache (`_offline:true`);
      cache miss → empty `[]`. Pure math extracted to `resources/js/lib/offline/queueMath.ts`
      (`computeQueuedDocumentTotals` mirrors `CommercialDocumentService` line math: gross =
      qty × unit_price_ht × pack_qty, fixed-amount discount per BASE unit, % on gross;
      `nextTempId` = negative epoch-seconds × 1e6 − seq; `offlineDocNumber`; guards
      `isOfflineQueuedResponse`/`isDocumentUrl`/`isDocumentPayload`). Both POS
      `handleCompleteSale` flows already read `res.document_number`/`res.total_stamp` with
      `??` fallbacks — resilient to the queued 202 shape. Test: `offline-math.spec.ts` (6).
- [x] **5.3 Sync engine** — on `online` event (and a manual button): replay queue in order,
      resolve temp ids → real ids, retry with backoff, surface failures (conflict → mark for
      review, never silently drop). `resources/js/lib/offline/syncEngine.ts`:
      `replayPendingOps(httpFn)` — FIFO replay, on success removes the op, tracks
      `tempId→realId` (`response.data.data.id ?? response.data.id`) and calls
      `resolveOpUrl(url, map)` which rewrites `/documents/-777` → `/documents/999` so a
      follow-up edit after an offline create is replayed as **PUT to the real doc**, never a
      second POST. `isPermanent` (4xx = surface-as-failed, never dropped) vs transient
      (5xx/network = bump `retries`, back off). `MAX_RETRIES = 3` then → `failed` with
      `lastError` (Arabic message from `errorMessage()`). Returns `SyncReport {replayed,
      failed, remaining}`. `useOffline.ts`: `useSync` auto-syncs on the `online` event +
      dispatches `offline:synced` CustomEvent; `retryFailedOps()` flips `failed` → `pending`
      and re-replays; `useFailedOpsCount`/`useFailedOps` for the UI. Test:
      `__tests__/sync-engine.spec.ts` (7 tests: FIFO, temp→real PUT rewrite, 4xx permanent,
      retries cap, error classification, `resolveOpUrl`, failed→pending replay).
- [ ] **5.4 Stock/availability offline** — cache lookups + stock-at into IndexedDB; show a
      stale-data warning badge. **State**: GET caching already stores EVERY successful GET
      (incl. `/stock-at` + POS lookups) for 5 min via the interceptor — the backend
      `InventoryStockService` stock-at 30s TTL is a separate server-side cache. **Remaining**:
      (1) propagate an "served from cache/offline" signal to consumers — the axios response
      carries `_offline:true` but `extractData()` (`resources/js/lib/api/core/client.ts`)
      strips it, so React Query never sees it; plan: module-level counter/setter in
      `client.ts` (e.g. `markOfflineServed()`) + a subscription so `OfflineIndicator` /
      POS pages can show "بيانات من ذاكرة محلية — قديمة" when stale/offline data is served;
      (2) raise the stock-at cache TTL above 5 min (30+ min) so stock survives short
      outages — keep the badge honest; (3) verify POS product card shows stock from the
      cached payload offline. Do NOT reduce online freshness (network-first already).
- [ ] **5.5 UI + tests** — offline banner (exists in `OfflineIndicator.tsx` at
      `resources/js/components/OfflineIndicator.tsx`, mounted in `DashboardLayout.tsx:853`;
      currently shows `syncing`/`sync` via `useSync` — new `useSync` is backward-compatible),
      **pending-count badge** (`useFailedOpsCount`), **sync-status screen** + a «إعادة
      المحاولة» (retry) button wired to `retryFailedOps()` for failed ops with their Arabic
      `lastError`, offline POS smoke (classic `POSPage.tsx` + `POSProPage.tsx` complete-sale
      flows already tolerate the queued 202 shape — verify visually), Vitest for queue
      ordering + PUT-not-POST replay (already covered by 5.1–5.3 suites; add any UI-level
      pure helpers if extracted).

---

## Progress

| Upgrade | Status | Notes |
|---------|--------|-------|
| 1. Fiscal QR + PDF | ✅ done (1.1–1.5) | DGI spec NOT published → documented versioned JSON v1 (`docs/reports/FISCAL_QR_SPEC.md`); scannability proven via jsqr round-trip |
| 2. Backup + restore | ✅ done (2.1–2.5) | command + schedule + restore + settings UI + E2E verified (`docs/reports/BACKUP_RESTORE_GUIDE.md`); 15 pre-existing POS `total_discount` defects flagged (not restore-introduced) |
| 3. Portal online payment | not started | — |
| 4. 2FA + permissions | not started | — |
| 5. Offline-first POS | 🔄 in progress (5.1–5.3 done) | queue + rich offline interception + sync engine pushed; 5.4 (stock offline + stale badge) next, then 5.5 (UI + tests) |

## Commits

Each completed task must be committed + pushed individually to `origin/main` (stage ONLY the
files belonging to that task; leave unrelated dirty files untouched):

| Commit | Contents |
|--------|----------|
| *(TODO file creation)* | `PRO_UPGRADE_TODO.md` + AGENTS.md mention |
| *(1.1)* | `app/Services/FiscalInvoiceQrService.php` (payload builder + svgBase64), `QRCodeService` delegates to it, `CommercialDocument::fiscal_qr_data` accessor, resource `qrcode_content`, `tests/Feature/FiscalInvoiceQrServiceTest.php` |
| *(1.2)* | `qrcode` + `@types/qrcode` npm deps, `components/preview/FiscalQR.tsx`, `FooterSection.tsx` real QR (fiscal payload priority), `ESCPOSRenderer` fiscal QR, `DocumentInfo.qrcodeContent` + `DocumentDataBuilder`, `__tests__/fiscalqr.pw.spec.ts` |
| *(1.3–1.5)* | `show_qr_code`/`qr_code_size`/`qr_code_align` settings + seeder; `runtime/exportPdf.ts` (dompdf.js WASM) + `pdf-export.pw.spec.ts`; `docs/reports/FISCAL_QR_SPEC.md` + `fiscal-qr-scan.spec.ts` |
| `a0f3136` *(2.1)* | `php artisan app:backup` — `app/Console/Commands/AppBackup.php` + `app/Services/BackupService.php` (sqlite copy / mysqldump, gzip, AES-256-GCM optional, retention, `DZB1` magic + sha256 sidecar) |
| `b0fc9f7` *(2.2)* | `routes/console.php` — daily 03:00 + weekly Sunday 03:15, keep 7 |
| `1938c34` *(2.3)* | `php artisan app:restore` — `app/Console/Commands/AppRestore.php` (verify magic+hash, confirm, refuse corrupt) |
| `ad070e5` *(2.4)* | Settings «النسخ الاحتياطي» tab — `BackupController` (6 routes), `BackupService::resolveForDownload`, `apiDownload` blob helper, `tenantKeys.backups`, `endpoints/backups.ts`, `tabs/BackupTab.tsx`, TABS + SettingsPage mount |
| `37123d1` *(2.4b)* | Backup API hardening — `{file}` resolved from the route (dispatcher splice was feeding the Company model into it → 500s on verify/download/restore/delete); `keep` floor (prune never wipes the archive); `prune()` re-glob before age-cap; client sends `keep` only when > 0 |
| `83e2606` | `public/sw.js` manifest refresh to match build (SW MATCH verified) |
| `fee7f14` *(2.5)* | E2E restore test (baseline → backup → mutate → restore → verify, all counts returned; live server 200) + `docs/reports/BACKUP_RESTORE_GUIDE.md`; test artifacts cleaned |
| `8918c3a` *(5.1)* | Write queue — `resources/js/lib/offline/db.ts` (PendingOp tempId/targetId/status/retries/lastError, FIFO `id ASC`, verbatim method+url = PUT-not-POST, `invalidateCache`/`getPendingOpsByStatus`/`getFailedOpsCount`/`markOpFailed`/`clearPendingOps`) + `__tests__/offline-queue.spec.ts` (6, `fake-indexeddb@^6.2.5` devDep) |
| `36cc51f` *(5.2)* | Rich offline interception — `offlineAwareApi.ts` queues mutations + returns 202 queued response (totals recomputed incl. pack×qty, `OFFLINE-<temp>` number, paid/net, balance nulls, `_offline`); 5-min GET cache (`_offline` flag, miss → `[]`); pure math → `queueMath.ts` (`computeQueuedDocumentTotals`/`nextTempId`/`offlineDocNumber`/guards) + `offline-math.spec.ts` (6) |
| `dd4178a` *(5.3)* | Sync engine — `syncEngine.ts` (`replayPendingOps` FIFO + `tempId→realId` map + `resolveOpUrl` rewrite so follow-ups PUT the real doc, `isPermanent` 4xx vs transient 5xx/network, `MAX_RETRIES=3` → `failed`+`lastError`, `SyncReport`); `useOffline.ts` (`useSync` auto-sync on `online` + `offline:synced` event, `retryFailedOps`, `useFailedOpsCount`/`useFailedOps`) + `sync-engine.spec.ts` (7) |
| *(5.4)* | stock/availability offline — propagate `_offline`-served signal to consumers (`client.ts` counter + subscription → OfflineIndicator/POS stale badge), raise stock-at cache TTL >5min, verify POS cards offline |
