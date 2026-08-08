# PRO Upgrade — Task Checklist

> **Status: 📝 CREATED (Aug 8) — nothing implemented yet.** Pick up on any PC:
> `git pull`, open this file, and work task-by-task. Commit + push after EACH task.

> **Goal**: take the sales-management ERP (Laravel + React POS, Algerian market) from a
> working system to a professional-grade product. Five upgrades, each self-contained.

## Global verification (run after every task)

- `npx tsc --noEmit` — clean
- `npm test` — 222/222 pass
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
- [ ] **1.2 QR rendering** — reuse the existing barcode infrastructure
      (`resources/js/lib/barcodeRenderer.ts`) or add a QR encoder (e.g. `qrcode`/`uqrcode`)
      that matches the thermal 80mm print (the ESC/POS QR command already exists in
      `EscPosBuilder`). Render the QR in BOTH `UniversalPreview` (page/invoice) and the
      ESC/POS path.
- [ ] **1.3 Print-template setting** — add `show_qr_code` (and QR size/position) to
      `SettingsRegistry.ts` + the items/footer sections; default on for FV.
- [ ] **1.4 Official PDF export** — server-side or client-side PDF of the invoice including the
      QR (e.g. `dompdf`/`pdfmake`, or the existing ExcelJS-style client export). Filename =
      `{number}.pdf`. Add an export button on the invoice detail modal + POS receipt.
- [ ] **1.5 Validation** — verify a generated QR scans and validates with the official Algerian
      DGI validator app (or a known-good QR test vector). Document the chosen spec + a test
      QR string in `docs/reports/FISCAL_QR_SPEC.md`.

## 2. Automated Backup + Restore

> **Goal**: scheduled, encrypted database backup with a tested one-click restore. This is
> accounting software — losing data is catastrophic, and there is currently NO protection.
>
> **Context**: `composer.json` may already have backup tooling; check before adding.
> DB is SQLite (`database/database.sqlite`) in dev, MySQL in prod (`.env DB_CONNECTION`).

- [ ] **2.1 Backup command** — `php artisan app:backup` (Laravel scheduler): dump the active
      connection (`sqlite` → file copy; `mysql` → `mysqldump`/query builder), gzip, optional
      GPG encryption, timestamped filename, retention (keep N days), write to `storage/app/backups`.
- [ ] **2.2 Schedule** — register in `routes/console.php` (daily, plus a weekly full).
- [ ] **2.3 Restore command** — `php artisan app:restore --file=<name>`: verify hash, restore
      with an explicit "current DB will be overwritten" confirm; refuse when the file is corrupt.
- [ ] **2.4 UI** — a "النسخ الاحتياطي" section in Settings (list backups, create now, download,
      restore, delete old). Use the existing settings page patterns.
- [ ] **2.5 Test** — create → mutate data → restore → verify data returns. Document the exact
      restore procedure in `docs/reports/BACKUP_RESTORE_GUIDE.md`.

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

- [ ] **5.1 Write queue** — IndexedDB queue (`resources/js/lib/offline/`) recording document
      creates/updates, payments, stock-changing ops with the FULL payload + `documentId`
      (replay must PUT, not POST — Phase 46 rule).
- [ ] **5.2 Offline interception** — route POS mutations through the queue when
      `navigator.onLine === false`; return optimistic success (temp id) and render the sale.
- [ ] **5.3 Sync engine** — on `online` event (and a manual button): replay queue in order,
      resolve temp ids → real ids, retry with backoff, surface failures (conflict → mark for
      review, never silently drop).
- [ ] **5.4 Stock/availability offline** — cache lookups + stock-at (30s TTL already exists in
      `InventoryStockService`) into IndexedDB; show a stale-data warning badge.
- [ ] **5.5 UI + tests** — offline banner (exists in `OfflineIndicator.tsx`), pending-count
      badge, sync-status screen; Vitest for the queue ordering + PUT-not-POST replay.

---

## Progress

| Upgrade | Status | Notes |
|---------|--------|-------|
| 1. Fiscal QR + PDF | in progress (1.1) | FiscalInvoiceQrService built; official DGI spec NOT published → documented v1 JSON schema |
| 2. Backup + restore | not started | — |
| 3. Portal online payment | not started | — |
| 4. 2FA + permissions | not started | — |
| 5. Offline-first POS | not started | — |

## Commits

Each completed task must be committed + pushed individually to `origin/main` (stage ONLY the
files belonging to that task; leave unrelated dirty files untouched):

| Commit | Contents |
|--------|----------|
| *(TODO file creation)* | `PRO_UPGRADE_TODO.md` + AGENTS.md mention |
| *(1.1)* | `app/Services/FiscalInvoiceQrService.php` (payload builder + svgBase64), `QRCodeService` delegates to it, `CommercialDocument::fiscal_qr_data` accessor, resource `qrcode_content`, `tests/Feature/FiscalInvoiceQrServiceTest.php` |
| ... | ... |
