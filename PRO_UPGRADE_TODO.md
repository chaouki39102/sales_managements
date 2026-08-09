# PRO Upgrade — Task Checklist

> **Status: ✅ DONE (Aug 9) — upgrades 1, 2, 4 & 5 fully complete (1.1–1.5, 2.1–2.5,
> 4.1–4.5, 5.1–5.5) + offline schema fix (v1→v2, `932b61f`). Upgrade 3 (portal online
> payment) is PLANNED but NOT started: the decided strategy is **mock-first** — build the
> gateway abstraction + a functional `MockGateway` now (works with NO merchant account), then
> swap in the real Algerian adapter when sandbox credentials arrive.** Pick up on any PC:
> `git pull`, open this file, and work task-by-task. Commit + push after EACH task.

> **Goal**: take the sales-management ERP (Laravel + React POS, Algerian market) from a
> working system to a professional-grade product. Five upgrades, each self-contained.

## Global verification (run after every task)

- `npx tsc --noEmit` — clean
- `npm test` — 249/249 pass (was 222; offline queue/math/sync/ttl/retry suites added, +1 migration suite)
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
> **Strategy — mock-first (decided 2026-08-09)**: a real Algerian gateway needs a merchant
> account + sandbox credentials we don't have yet, so build the FEATURE behind a **gateway
> abstraction** now: a `PaymentGateway` interface + a functional **`MockGateway`** (sandbox,
> no credentials, works today) so 3.1–3.5 ship end-to-end and are demoable; swap in the real
> adapter (EDAHABIA / CIB e-payment / CTPay, SATIM-style) later when sandbox creds arrive.
> Alternatives researched: Chargily Pay / DZBuild Slick-Pay (easy API) vs SATIM direct (heavy
> certification). **Payment flow reuses `PaymentSynchronizer::syncPayments`** (client_ref
> idempotency, treasury, PAY-YYYY-NNNNNN — the canonical payment lifecycle). A `paid` marker
> on `portal_orders` is ORTHOGONAL to the order status (fulfillment stays
> preparing→confirmed→…→delivered; payment is tracked via portal_orders fields + a confirmed
> payment, NOT a new status).
>
> **Context**: portal API lives outside `{company}` (`routes/api.php`, `portalClient` axios
> instance in `resources/js/lib/api/portal/`). Portal order lifecycle: `PortalOrderController`
> (customer) + `PortalOrdersController` (admin, convert). Payment models/checks exist
> (`resources/js/lib/api/endpoints/payments.ts`, `checks.ts`). `portal_orders` has NO paid
> field yet — 3.1 adds the payment columns migration.

- [x] **3.1 Gateway abstraction + settings + migration** — `2bf2de5`. `app/Services/Payments/Gateway/`
      `PaymentGateway.php` (interface: `createPayment(intent) → {redirect_url, intent_id}`, `verify(notification)`,
      `name()`, `sign()`) + `PaymentGatewayFactory::resolve()` (defaults to `mock` when no provider setting) +
      `MockGateway` (sandbox: `MOCK-<16>` intent ref, amount from server, confirm txn `MOCKTXN-<12>`, shared-secret
      HMAC-SHA256). Settings portal group: `online_payment_enabled` (bool false), `online_payment_provider` (`mock`),
      `online_payment_mode` (`sandbox`), `online_payment_merchant_id`, `online_payment_secret_key`. Migration
      `2026_08_09_000001_add_payment_columns_to_portal_orders_table` adds `payment_intent_id`, `payment_status`
      (default pending), `payment_amount`, `payment_provider`, `payment_mode_id`, `paid_at` (nullable),
      `payment_details` (json). Public `GET /{company}/portal/config` gains `online_payment_enabled`.
- [x] **3.2 Backend payment initiation** — `f90f5b8`. `POST /{company}/portal/orders/{id}/pay` (portal.auth):
      guards `online_payment_enabled` (409 «الدفع الإلكتروني غير مفعّل…»), order owned by the portal user,
      payment not already succeeded (409 «هذا الطلب مدفوع بالفعل.») → create ONE intent per order (idempotent —
      a repeat call on a pending intent returns the SAME `{payment_url, payment_intent_id}`; succeeded/converted/
      terminal orders rejected 409). **Amount ALWAYS server-computed** = order `total_ttc` (never client-sent).
      Returns `PortalPayIntent` (`order_id`, `order_reference`, `payment_intent_id`, `payment_status`, `amount`,
      `payment_url`).
- [x] **3.3 Webhook/notification handler** — `c60e89c` (backend) + `5de888e` (mock page + in-process dispatch).
      Public `POST /{company}/portal/payment/webhook` (`{company}/portal` group, OUTSIDE `portal.auth`),
      verified via the gateway adapter — mock = shared-secret HMAC-SHA256: `verifyNotification()` first
      (forged → 403), amount MUST equal the stored intent amount ±0.01 (else 422 «مبلغ إشعار الدفع لا يطابق
      قيمة الطلب.»), `ts` within a 3600s window (else 422 «منتهي الصلاحية»), unknown intent → 404. ONE
      idempotent apply via `settlePayment()`: same txn already succeeded → 200 no-op; different txn → 409;
      terminal order → 409; succeeded sets `payment_status` + `payment_transaction_id` + `paid_at` + history
      («دفع عبر الإنترنت»); failed/cancelled record status only (order stays payable). **No accounting
      payment at webhook** — deferred to `convertToSale()` via `onlinePaymentPayload()` when
      `payment_status == succeeded` (mode ONL, `client_ref = 'ONL-'.reference`, server amount). MockGateway
      page (`/portal-gateway/mock/{reference}`, `routes/web.php`) CONFIRM/CANCEL → same in-process handler
      (no self-`Http::post` — avoids deadlock) → redirect to `/portal/{slug}/myorders?order_id=..&pay_result=…`.
- [x] **3.4 Portal UI** — `7b1bfd1`. «الدفع الإلكتروني (amount)» button on My Orders rows (paid-eligible
      only: `cfg.online_payment_enabled === true && !is_converted && payment_status !== 'succeeded'` and not
      terminal) → opens the gateway `payment_url` in a new tab (`noopener,noreferrer`) + toast; when a
      pending intent exists the label becomes «متابعة الدفع» with a hint. `?pay_result=succeeded|cancelled|…`
      return handling on `/portal/orders` (strips the params, ok/err toasts per result). «مدفوع» badge
      (`paid_at` title) beside the order status; `payment_status`/`payment_amount`/`payment_provider`/
      `payment_intent_id`/`payment_transaction_id`/`paid_at` exposed via `PortalOrder.toArray`.
- [x] **3.5 Security + tests** — `dbf4477`. `tests/Feature/PortalPaymentFlowTest.php` — 7 tests / 46
      assertions: disabled setting → 409; intent creation + idempotence (same URL/intent ref); forged
      signature → 403; succeeded webhook → settle (`succeeded` + `MOCKTXN-*` + `paid_at`) + same-txn replay
      no-op + different txn 409 + paid order blocks re-pay 409; amount-mismatch 422 + expired `ts` 422;
      unknown intent → 404; cancelled records status without settling (order stays payable). Full gate
      green: pest 70/70 (466 assertions), tsc clean, vitest 249/249, build 0 errors (219 precache), SW MATCH.

## 4. 2FA + Granular Permissions

> **Goal**: multi-user trust — TOTP two-factor auth for users and per-role permission control.
> An audit log already exists (`DataAuditSubscriber`, Phase 40).
>
> **Context**: auth is Laravel Sanctum (`routes/api.php`, `AuthProvider` frontend). Users are
> multi-company via `company_user` pivot (the `company` middleware checks `company_user.active`).
> Check `composer.json` for `spatie/laravel-permission` before deciding.

- [x] **4.1 TOTP 2FA** — `de1642f` backend: `TwoFactorAuthService` TOTP secret generate/verify
      (`pragmarx/google2fa-laravel`-style, stored **encrypted** in `users.two_factor_secret` via the
      `encrypted` cast), QR provisioning URI, setup → enable (6-digit verify) → disable (code required),
      one-time backup codes (10 × `XXXX-XXXX-XXXX`) with regenerate, `two_factor_enabled_at` flag.
      `f0efae5` two-step login UI (`LoginPage` creds → 6-digit code → confirm), `28797c9` SecurityTab
      (الأمان) enrollment UI (QR + secret + verify → enable + backup codes save-ack + disable). Login
      challenge route `auth/two-factor/confirm` returns `TWO_FACTOR_REQUIRED` when enabled.
- [x] **4.2 Backend middleware** — `6ea1207`: `EnsureTwoFactorVerified` middleware (any Sanctum token
      issued **before** `two_factor_enabled_at` is deleted + 401 `TWO_FACTOR_REQUIRED`), `2fa.verified`
      alias applied to all 4 `auth:sanctum` route groups; `enable()` now wipes ALL existing tokens
      (even the current session) so no pre-2FA token survives. Backup codes are one-time for lockout
      recovery.
- [x] **4.3 Roles/permissions** — `c616ea4`: `company:upgrade-roles` migration + `CompanyRoleService`
      — per-company role set = `owner`/`manager`/`cashier`/`viewer` + permission matrix mapped onto the
      existing `can:*` feature flags (spatie/laravel-permission absent; custom `company_roles` +
      `permissions` pivot). Owner column locked; single-role-per-company enforced.
- [x] **4.4 Admin UI** — `27aff33`: RolesPage roles/permissions matrix (بطاقات/المصفوفة toggle,
      read-only, owner locked), role-assign select + 2FA chip per UsersPage row; `RoleController::show`
      dead-bug fix; `roles-matrix.css`.
- [x] **4.5 Tests** — `tests/Feature/TwoFactorEnforcementTest.php` (5 tests: plain login token valid,
      pre-enable tokens revoked+deleted, enable wipes sessions, challenge+confirm issues fresh token,
      one-time backup codes; throttle disabled in tests). Permission denial → 403 covered by the
      existing `can:*` middleware behavior.

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
      **Schema fix (`932b61f`)**: the `status` index added here was never migrated to existing
      browsers (DB_VERSION stayed 1 → `upgradeneeded` never fired → `getPendingOpsByStatus`/
      `getFailedOpsCount` crashed with `NotFoundError`). Now `DB_VERSION = 2` and `upgrade()`
      REPAIRS existing stores in place (`store.indexNames.contains` guard + `createIndex` for
      `status`, `createdAt`, `expiresAt`); test hook `resetOfflineDbForTests()`; regression
      suite `__tests__/db-migration.spec.ts`.
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
- [x] **5.4 Stock/availability offline** — cache lookups + stock-at into IndexedDB; show a
      stale-data warning badge. `offlineAwareApi.ts` cache TTL is now **URL-aware**
      (`cacheTtlForUrl`, exported + tested): `/inventory/stock-at` → 30 min (survives short
      outages), all other GETs → 5 min. A reactive **stale-data signal** tells consumers data
      was served from cache: `isDataStale()` / `subscribeDataStale()` in the interceptor (set
      on any offline GET serve, cleared on the next real network response) +
      `useOfflineServed()` hook. `OfflineIndicator` shows a «بيانات من ذاكرة محلية (قديمة)»
      badge (`ti-history`) in the `stale` state. Test: `__tests__/offline-cache-ttl.spec.ts`.
- [x] **5.5 UI + tests** — `OfflineIndicator` now surfaces **failed ops**: failed count badge
      (`ti-alert-triangle`), click-to-open popover panel (`.offline-pop`) listing each failed
      op (method + url + Arabic `lastError`) with an **«إعادة المحاولة»** button that calls
      `retryFailedOps()` (failed→pending, clears retries/lastError) then `sync()`. Stale /
      syncing / offline states all styled (`.offline-widget`/`.offline-pop*` in `layout.css`).
      POS offline resilience verified: both classic `POSPage.handleCompleteSale` and
      `POSProPage.handleCompleteSale` read `res.document_number ?? ''` — tolerant of the
      queued 202 `OFFLINE-<temp>` number (receipt + toast still work offline). `SyncResult`
      re-exported from `useOffline.ts`. Test: `__tests__/retry-failed.spec.ts` (reset
      status/retries/lastError; no-op when none failed).

---

## Progress

| Upgrade | Status | Notes |
|---------|--------|-------|
| 1. Fiscal QR + PDF | ✅ done (1.1–1.5) | DGI spec NOT published → documented versioned JSON v1 (`docs/reports/FISCAL_QR_SPEC.md`); scannability proven via jsqr round-trip |
| 2. Backup + restore | ✅ done (2.1–2.5) | command + schedule + restore + settings UI + E2E verified (`docs/reports/BACKUP_RESTORE_GUIDE.md`); 15 pre-existing POS `total_discount` defects flagged (not restore-introduced) |
| 3. Portal online payment | ✅ done (3.1–3.5, mock-first) | gateway abstraction + `MockGateway` (works with NO merchant account) + signed webhook + portal pay button + `?pay_result` handling + `PortalPaymentFlowTest` (7 tests / 46 assertions); swap real Algerian adapter (EDAHABIA / CIB / CTPay) when sandbox creds arrive — see section 3 |
| 4. 2FA + permissions | ✅ done (4.1–4.5) | TOTP 2FA + two-step login + backup codes + `EnsureTwoFactorVerified` session enforcement + owner/manager/cashier/viewer roles + permission matrix + admin UI; 5 pest tests in `TwoFactorEnforcementTest` |
| 5. Offline-first POS | ✅ done (5.1–5.5) + schema fix | write queue + rich offline interception + sync engine + stock/stale badge + failed-ops UI all pushed; IndexedDB v1→v2 migration fix (`932b61f`); 249 vitest pass |

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
| `d225429` *(5.4)* | Stock/availability offline + stale badge — `offlineAwareApi.ts` exports `cacheTtlForUrl` (stock-at 30 min vs 5 min default) + reactive stale signal (`isDataStale`/`subscribeDataStale`, set on offline GET serve, reset on real network GET); `useOffline.ts` `useOfflineServed()`; `OfflineIndicator` stale badge («بيانات من ذاكرة محلية»); `.offline-indicator` CSS; `offline-cache-ttl.spec.ts` (2) |
| `b3c5480` *(5.5)* | Failed-ops UI — `OfflineIndicator` rewrite: failed-count badge + click popover (`.offline-pop`) listing method/url/Arabic `lastError` per failed op + «إعادة المحاولة» (`retryFailedOps()` then `sync()`); `.offline-widget`/`.offline-pop*` CSS; `SyncResult` re-export; `retry-failed.spec.ts` (2); POS offline resilience verified (both POSes `res.document_number ?? ''` tolerate `OFFLINE-<temp>`); 248 tests |
| `932b61f` *(5.1 fix)* | Offline IndexedDB v1→v2 migration — `resources/js/lib/offline/db.ts` `DB_VERSION` 1→2 + `upgrade()` now REPAIRS existing stores in place (`store.indexNames.contains` guard + `createIndex` for `status`, `createdAt`, `expiresAt`; records survive), fixing the `NotFoundError: ... index was not found` crash (commit `8918c3a` added the `status` index + `getPendingOpsByStatus`/`getFailedOpsCount` consumers without bumping the version, so legacy v1 browsers never migrated); test hook `resetOfflineDbForTests()` (closes + nulls cached `dbPromise`); regression `__tests__/db-migration.spec.ts` (seeds legacy v1 schema, migrates, asserts status index works with legacy record intact); tsc clean, vitest 249/249, build 219 precache, SW MATCH |
| `5c08dfd` *(docs)* | AGENTS.md Phase 68 follow-up — documents the v1→v2 migration bug, fix, and rules (any new IDB index/store MUST bump `DB_VERSION`; migrations repair existing stores; no `deleteDatabase` choreography needed under fake-indexeddb) |
| `de1642f` *(4.1)* | 2FA backend — `TwoFactorAuthService` (TOTP secret generate/verify, encrypted storage via `encrypted` cast on `users.two_factor_secret`, QR provisioning URI, setup/enable/disable, one-time backup codes 10×`XXXX-XXXX-XXXX` + regenerate, `two_factor_enabled_at`), `TwoFactorAuthController`, login challenge `auth/two-factor/confirm` → `TWO_FACTOR_REQUIRED` |
| `f0efae5` *(4.1b)* | two-step 2FA login UI — `LoginPage` creds → 6-digit code → confirm (redirect through the code step when `TWO_FACTOR_REQUIRED`) |
| `28797c9` *(4.1c)* | 2FA SecurityTab (الأمان) in Settings — status badge, QR + secret enrollment (`useTwoFactorSetup`), 6-digit verify → enable, one-time backup codes with save-ack, regenerate via `recoveryCodes`, disable with current code + ConfirmModal; wired into TABS + SettingsPage; `.sec-*` CSS |
| `6ea1207` *(4.2)* | session-level 2FA enforcement — `EnsureTwoFactorVerified` middleware (deletes any Sanctum token issued before `two_factor_enabled_at` + 401 `TWO_FACTOR_REQUIRED`), `2fa.verified` alias on all 4 `auth:sanctum` route groups, `enable()` wipes ALL existing tokens (even current session); `tests/Feature/TwoFactorEnforcementTest.php` (5 tests) |
| `c616ea4` *(4.3)* | company role set + permission matrix — `CompanyRoleService` + `company:upgrade-roles` migration: per-company roles owner/manager/cashier/viewer mapped onto `can:*` feature flags; single-role-per-company, owner locked |
| `27aff33` *(4.4)* | admin UI for granular permissions — RolesPage roles/permissions matrix (بطاقات/المصفوفة toggle, read-only, owner column locked), role-assign select + 2FA chip per UsersPage row; `RoleController::show` dead-bug fix; `roles-matrix.css`; pest 63/420, vitest 248/248, build 219 precache, SW MATCH |
