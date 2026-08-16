# Remaining Tasks — B (Camera), C (Offline), D (WhatsApp) — Full Actionable List

> **Status: ✅ C.1–C.5 + B.1–B.4 COMPLETE (all committed + pushed).** Pick up on any PC: `git pull`,
> open this file, work task-by-task. **Commit + push after EACH task** (stage ONLY that task's
> files). C is being implemented first (decided with the user), then B, then D.
>
> **Resume point now**: the whole C family (offline everywhere / field agents) is DONE and
> pushed (C.1 offline interception, C.2 documents-module offline hardening, C.3 prefetch
> page, C.4 sync dashboard at `/offline`, C.5 offline POS Pro Mobile `314afea`). **B.1**, **B.2**,
> **B.3** and **B.4** are DONE (camera scan everywhere + camera product-photo capture + scan
> printed fiscal QR → reopen the exact document + photograph a supplier invoice → OCR prefill →
> FA doc). Next is **B.5** (camera stock-taking → stock adjustment). HEAD: B.4.

---

## ⚠️ CRITICAL DISCOVERY — the C.1 blocker (already proven, NOW FIXED)

The entire offline layer **never fires today** (write queue + cached GETs). Root cause is
**response-interceptor ordering**, not the `navigator.onLine` gate:

1. `resources/js/lib/api/core/client.ts` registers its response **error** interceptor at
   **module-import time** (line ~169). It converts EVERY network error into
   `ApiError(status 0)` — which has **no `.config`**.
2. `resources/js/lib/offline/offlineAwareApi.ts` registers its interceptor LATER via
   `registerOfflineInterceptor()` (called from `resources/js/app.jsx:14`).
3. Axios runs response interceptors in **registration order** (confirmed in
   `node_modules/axios/lib/core/Axios.js` lines 180→227, axios 1.15.2).
4. So on a transport failure: client.ts normalizes first → the offline interceptor receives
   an `ApiError`, hits `if (!cfg) throw error` (offlineAwareApi.ts line ~62), and rethrows →
   **the offline mutation queue and cached-GET path never run.**

**Proof** (was): `probe-chain.spec.ts` reproduced the real boot order (client mapper first,
then `registerOfflineInterceptor()`), stubbed a raw network-error adapter, forced
`navigator.onLine = false`, POSTed, and asserted 1 queued op — it **failed with 0**.

**FIX (implemented, C.1, committed)**: client.ts now offers a **pre-normalization hook** —
`registerNetworkFailureHandler(fn)` — a module-level handler that runs BEFORE the ApiError
conversion (receives the RAW AxiosError with `.config`/`.code`), returns a synthetic
`AxiosResponse` to claim a request (offline path) or `undefined` to fall through to normal
error mapping. The offline layer registers through that hook (not as a second response
error interceptor).

**Key implementation notes** (deviations from the original plan, all intentional & tested):
- **Gate is `isNetworkFailure(error)` ONLY** — NOT `isNetworkFailure(error) || !navigator.onLine`.
  The browser flag is unreliable (flaky links) and as an override it would queue 4xx/5xx or
  `ERR_CANCELED` when the browser merely *reports* offline. `isNetworkFailure` already
  subsumes connectivity via the error itself (`!!err.request` fallback covers no-code
  transport errors). Contract pinned by tests: 4xx/5xx (response present) ALWAYS surface →
  0 ops, even with `navigator.onLine = false`; `ERR_CANCELED`/config errors never queue;
  transport failures queue regardless of `navigator.onLine`.
- Synthetic offline responses (202 ack / cached / empty) have NO `response.config` — axios
  only injects it on real dispatch. The success interceptor uses `cfg?.method?.toLowerCase()`
  optional chaining; missing config = non-cacheable and must never clear the stale badge
  (`_offline` guard is defense-in-depth).
- `cfg.data` at hook time is the post-transform **JSON string** (axios default
  `transformRequest`). The hook parses it back to an object so
  `isDocumentPayload`/`computeQueuedDocumentTotals` work and the queue stores typed data;
  replay re-sends it and axios re-stringifies → identical wire bytes.

---

## Global verification (after every task)

```
npx tsc --noEmit                      # clean
npm test                              # all pass (offline suites stay green)
npm run build                         # 0 errors
(Get-FileHash public/sw.js -Algorithm SHA256).Hash -eq (Get-FileHash public/build/sw.js -Algorithm SHA256).Hash   # SW MATCH
vendor\bin\pest.bat                   # when PHP files touched
```
Live smoke via Playwright Chromium (fresh browser, fresh token) — zero console/page errors.

---

# C. Offline Everywhere / Field Agents  (FIRST — ✅ DONE)

> Context: `resources/js/lib/offline/` — `db.ts` (IndexedDB write queue, `PendingOp`, FIFO
> `id ASC`, verbatim method+url), `offlineAwareApi.ts` (interceptor), `syncEngine.ts`
> (`replayPendingOps` FIFO + `tempId→realId` + `resolveOpUrl`, `isPermanent` 4xx vs retryable,
> `MAX_RETRIES=3`), `useOffline.ts` (`useSync`, `retryFailedOps`, `useFailedOps`),
> `queueMath.ts` (pure totals/guards). Offline suites: `resources/js/lib/offline/__tests__/`.

## C.1 Any network failure = offline (server-unreachable) — ✅ COMPLETE

Tasks (detailed):

- **C.1a `isNetworkFailure()` predicate** — ✅ **DONE** at the end of `queueMath.ts`:
  `NETWORK_FAILURE_CODES` (ERR_NETWORK, ERR_INTERNET_DISCONNECTED,
  ERR_CONNECTION_REFUSED/RESET/CLOSED, ERR_NAME_NOT_RESOLVED, ERR_EMPTY_RESPONSE,
  ERR_ADDRESS_UNREACHABLE, ERR_HTTP2_PROTOCOL_ERROR, ENOTFOUND, ECONNREFUSED, ECONNRESET,
  ENETUNREACH, EHOSTUNREACH, ETIMEDOUT, EAI_AGAIN) + `NON_NETWORK_CODES` (ERR_CANCELED,
  ERR_BAD_OPTION, ERR_BAD_OPTION_VALUE, ERR_BAD_REQUEST). Semantics: `error.response` present
  → FALSE (4xx/5xx surface); NON_NETWORK → FALSE; NETWORK → TRUE; no code → `!!err.request`.
  Unit cases in `__tests__/offline-math.spec.ts` (timeout→true, ERR_CANCELED→false, 422→false,
  no-code-with-request→true, plain/null→false).

- **C.1b Fix interceptor ordering** — ✅ **DONE** in `client.ts`:
  `registerNetworkFailureHandler(fn: (error: AxiosError) => Promise<AxiosResponse|undefined> | undefined)`
  (module-level `_networkFailureHandler`). At the TOP of the existing response error interceptor
  (before the ApiError mapping): `if (!error.response && _networkFailureHandler) { const h = await _networkFailureHandler(error); if (h) return h; }`.
  Gives the offline layer the RAW error (`.config` + `.code`).

- **C.1c Rework `offlineAwareApi.ts`** — ✅ **DONE**: imports `registerNetworkFailureHandler`
  + `isNetworkFailure`. Success interceptor kept for GET caching + stale clear, guarded:
  skip `setCache` AND skip stale-clear when `(response as any)._offline === true` (a synthetic
  202 must not re-cache nor clear the stale badge), and `cfg?.method` optional-chaining (no
  `.config` on synthetic responses). The error half is REMOVED; the offline path registers via
  the hook: **gate = `isNetworkFailure(error)` ONLY** (deviation documented above); mutation
  branch → enqueue + 202 logic; GET branch → cached response; else return `undefined` (falls
  through to client.ts error mapping). `registered` once-guard kept.

- **C.1d Regression tests** — ✅ **DONE**: `probe-chain.spec.ts` REPLACED by the permanent
  `__tests__/offline-interceptor.spec.ts` (9 tests): (a) boot-order sim via the real `client.ts`
  import + `registerOfflineInterceptor()` (must NOT wipe existing interceptors); `navigator.onLine = false`;
  custom adapter throws raw `ERR_NETWORK` with `.config`; `POST /demo/documents` → 1 pending op
  + 202 response with locally computed totals. (b) 422/500 WITH `response` → 0 ops and the error
  surfaces. Plus: flaky-link (navigator online) still queues; ERR_CANCELED never queues;
  cached GET served; empty-cache GET → `[]`; stale-badge semantics; non-document mutation →
  minimal ack body.

- **Verify + commit** — ✅ **DONE**: tsc clean, `npm test` 265/265 (16 files), `npm run build`
  0 errors, SW MATCH. Committed + pushed as `fix(offline): offline interception was dead — ...`.

## C.2 Documents module offline — ✅ COMPLETE

- Verify + harden commercial-document create/edit (classic form `useCommercialDocumentController`
  saveMut PUT-via-`documentId`, `QuickSaleModal`, returns) against the queued 202 shape.
- `document_number` fallback `?? ''` everywhere; NO navigation to a temp id.
- Offline-aware success toast («سيُحفظ عند توفر الاتصال»).
- `OFFLINE-<n>` receipt print keeps working.
- Replay already rewrites `PUT /documents/<temp>` → real id via `resolveOpUrl` — confirm with a
  field-agent flow: create → edit → pay → sync.
- Verify: unit + a Vitest flow test + Playwright smoke.

## C.3 Offline data readiness for the field — ✅ COMPLETE

- Longer cache TTLs for field-critical GETs (parties, products list; stock-at already 30 min)
  via `cacheTtlForUrl` (in `offlineAwareApi.ts`).
- New **«جهّز للعمل دون اتصال»** button: prefetch + cache essentials (products, parties, price
  levels, warehouse stock) so an agent leaves coverage with data.
- Show cache-freshness per dataset in the offline indicator.
- Verify: vitest (prefetch writes ops/cache), manual offline reload shows data + stale badge.

## C.4 Field-agent sync dashboard — ✅ COMPLETE

- New page (route `/offline` or inside settings): pending ops list (method/url/target + time),
  failed ops with Arabic `lastError` + per-op retry + «إعادة المحاولة للكل», «مزامنة الآن»
  button + last-synced stamp, temp→real id resolution display.
- Reuse `useFailedOps`/`getPendingOps`; existing `OfflineIndicator` popover stays the quick glance.
- Verify: tsc, vitest, build, SW MATCH, live smoke.

## C.5 Offline POS Pro Mobile — ✅ COMPLETE

- Verify `/pos/pro/mobile` (shares desktop POS Pro cart store + payment pipeline) fully offline:
  session-open guard falls back to last-known session, cart hold/restore, camera scan, payment
  queue, thermal print with `OFFLINE-<n>`, auto-sync on reconnect.
- Fix whatever breaks; field-agent POS is the demo.
- Verify: build + SW MATCH + Playwright offline simulation.

**DONE** (committed `314afea`): `/pos/pro/mobile` now keeps working offline —
- **Session fallback**: `loadLastKnownSession`/`saveLastKnownSession` (localStorage per slug)
  persist the last real `PosSession` from the server; `useCurrentPosSession` results that come
  back empty/offline (via `useOfflineServed` / `useOnlineStatus`) fall back to the last-known
  session instead of locking the screen — the session id stays in the payment/receipt pipeline.
- **Offline success toast**: queued mutations are detected via
  `isOfflineQueuedResponse(res)` → «أُضيفت الفاتورة إلى قائمة الانتظار — سيُحفظ عند توفر
  الاتصال (OFFLINE-<n>)» instead of the normal saved message.
- **Offline affordances**: `useOnlineStatus`/`useOfflineServed`/`useSync` drive an appbar
  cloud button (tap → `sync()`, spins while `syncing`) shown only offline/stale, plus a
  «دون اتصال» chip in the session strip.
- **Entry point**: «دون اتصال» became a first-class sidebar item (nav group in
  `DashboardLayout`) pointing at the `/offline` sync dashboard.
- Cart hold/restore and camera scan are local-store/local-device (offline-safe by design);
  payment queue, cached GETs, and auto-sync-on-reconnect come from the C.1–C.4 offline layer.

**Verification (this session)**: `npx tsc --noEmit` clean · `npm test` 273/273 (18 files, incl.
all 9 offline suites) · `npm run build` 0 errors, 224 precache entries · SW MATCH
(root `public/sw.js` hash == `public/build/sw.js`).

---

# B. Camera-Native Commerce  (SECOND)

> Context: `resources/js/components/BarcodeScannerModal.tsx` (html5-qrcode, environment camera,
> beep + flash on hit) exists, wired only into POS scanbars. Fiscal QR (`qrcode_content`) is
> rendered on FV/POS prints (Phase 69 / upgrade 1) and can be DECODED to reopen a doc. Product
> photo upload exists (`image_url`/upload path).

## B.1 Camera scan everywhere — ✅ COMPLETE (`555f5bd` + `ac0d6d9`)

- Shared `useBarcodeScan()` hook (`resources/js/hooks/useBarcodeScan.ts`) + global camera affordance
  outside the POS: documents form (scan product barcode → add as line), products page (scan → open
  product), parties page (scan party barcode/NIF → open).
- Refactor `BarcodeScannerModal` to accept `title`/`hint` + `onScan` so every page reuses one impl.
- Verify: tsc, build, SW MATCH, Playwright scan-smoke (mock the camera feed) — ✅ all green
  (`barcode-scan.pw.spec.ts`, 3/3 passed; `npm test` 273/273; build 224 precache; SW MATCH).
- Follow-up (`ac0d6d9`): root-cause fix — the globally-mounted quick-create
  `CommercialDocumentModal` kept its whole form body in the DOM when closed (`opacity:0`/
  `pointer-events:none`), leaking a hidden duplicate camera button + `BarcodeInput` onto every page.
  Body is now unmounted 250ms after close (`bodyMounted` + `useEffect` on `open`); state survives
  via the always-mounted `useCommercialDocumentController` hook + localStorage drafts. The spec's
  documents test became a strict global-count guard (`toHaveCount(1)`). Also refreshed the stale
  `pdf-export.pw.spec.ts` fixture (dead token + stale slug + missing FV → recreated via
  `CommercialDocumentService`). Full suite green: Playwright 14/14, vitest 273/273.

## B.2 Photograph a product — ✅ COMPLETE (`fff065f` + `a9377d1`)

- `CameraCaptureModal.tsx` (lazy-loaded): camera capture on the product create/edit form
  (`getUserMedia` → video preview → canvas → blob File) instead of only pasting a URL. A
  «كاميرا» toolbar button (the «الملتفطة» typo fixed to «الملتقطة») opens it; the capture
  appears as a pending local blob preview in the image strip.
- Upload is deferred to save: `handleSubmit` awaits the create/update mutation, resolves the
  REAL product id (edit → existing id; network create → `saved.id`; offline-queued create →
  none), then uploads the pending blob via the existing `productsApi.uploadImage` path with a
  progress bar. Offline create → info toast «أُضيف المنتج إلى قائمة الانتظار — ستُرفع الصورة
  الملتقطة لاحقاً من صفحة تعديل المنتج». Pending blob is revoked on close/save (no leaks);
  switching tabs keeps it (local state only, no network).
- Verify: tsc clean · `npm test` 273/273 · `npm run build` 0 errors · SW MATCH · Playwright
  `camera-capture.pw.spec.ts` 2/2 (create + edit mode, mocked camera + mocked upload route).
- Test repair (`a9377d1`): `pdf-export.pw.spec.ts` converted to a FULLY-MOCKED E2E (the old
  one depended on a live seed token + a real FV-2026-000001 in company 1 — both rotted). The
  new spec boots the docs page from mocked `/document-types`, `/documents` list + `/documents/7`
  detail routes (registered AFTER `bootstrapApp`), walks the row «طباعة» → TemplatePrintModal →
  PDF button, and asserts the download is named `FV-2026-000001.pdf` with a `%PDF-` header.
  Playwright suite green 16/16.

## B.3 Scan printed invoice → reopen the doc — ✅ COMPLETE (`1dee679`)

- `resources/js/lib/fiscalQr.ts` — pure, dependency-free decoder for the printed fiscal QR
  (JSON v1 from `FiscalInvoiceQrService::dataString()`, `invoice.number` = e.g. `FV-2026-000001`).
  Tolerant by design: any JSON object carrying a string `invoice.number` decodes, so a future
  official-spec bump that keeps the number in the same place survives.
- **Admin documents page** (`CommercialDocumentsPage.tsx`): a camera button in the toolbar
  (`.ti-camera`, `title="مسح QR الفاتورة لفتح المستند"`) opens the lazy `BarcodeScannerModal`
  (title «مسح QR المستند لفتحه»). On decode it searches `/documents?filter[document_number]=N`
  and opens the `DocumentViewModal` for the EXACT match; no match → toast «لم يتم العثور على
  مستند بهذا الرقم». `useBarcodeScan` resolve is async (server lookup).
- **Portal «طلباتي»** (`PortalMyOrdersPage.tsx`): a «مسح» button in the toolbar (`.portal-toolbar-sp`,
  em pill). Decode → `portalApi.orders({ search: number })`; the resolved order's `reference` is
  the CMD number while `document.document_number` is the converted FV/POS number (both accepted
  defensively) → search chip + order detail open. `portalApi.orders` gained `search`; the backend
  (`PortalOrderService::paginate`) matches the CONVERTED doc number via
  `conv.source_document_id = portal_orders.commercial_document_id` (`orWhereExists`), scoped to
  `conv.deleted_at IS NULL`.
- **Decoder blocker (the real B.3 work)**: `BarcodeScannerModal` `QRZ_CONFIG.qrbox` was a
  landscape `280×140`, but html5-qrcode v2.3.8 decodes with **ZXing** (not jsQR), and its
  `foreverScan` crops the video into a decode canvas fixed at the qrbox size — a square QR was
  capped at 140px (~1.8px/module) and ZXing could never decode it. The box is now **square
  `280×280`** (~3.6px/module) → the full payload decodes. This is a deliberate product
  improvement, not a test hack.
- **Verify** (`fiscal-scan.pw.spec.ts`, 3/3): REAL-QR E2E — `getUserMedia` replaced by a canvas
  stream continuously redrawn from the committed QR SVG fixture, sized `280 × videoWidth/clientWidth`
  so the QR exactly fills the square scan box in video pixels (exercises the real ZXing decode path).
  Tests: admin scan → exact FV view modal; unknown QR → not-found toast; portal scan → CMD order
  tracked. Plus a Pest regression (`PortalOrderRequestTest` «B.3: customer search by the converted
  FV number finds the order») proving the `source_document_id` search. Full green: tsc clean ·
  vitest 278/278 (19 files) · Playwright 19/19 · build 226 precache · SW MATCH · pest portal suite 25/25.

## B.4 Photograph a supplier invoice → book it (OCR) — ✅ COMPLETE

- ✅ **DONE** — lazy `InvoiceOcrModal` (`resources/js/pages/documents/components/InvoiceOcrModal.tsx`)
  + pure parser `resources/js/lib/invoiceOcr.ts` (lazy `ppu-paddle-ocr` runner, fully on-device,
  no bundle cost until used) wired into the purchase (`FA`) document page: `DocumentLinesSection`
  gains a «تصوير فاتورة المورد» camera toolbar button (purchases only) → `CameraCaptureModal`
  (reused) → OCR → preview modal (date / supplier / reference / per-line qty+unit-price with
  product matching, editable) → «تعبئة المستند» applies `document_date` + `party_id` + lines via
  `bulkAddLines`. OCR is a *prefill* helper — the stored doc is still a normal `FA` doc, saved by
  the standard pipeline.
- **Parser robustness**: French/Arabic decimal + Arabic-Indic digits, `dd/mm/yyyy` + ISO dates,
  longest-hit supplier/product matching (NIF/RC/phone/barcode/ref), TVA rate = first number on a
  `%` line, product matching falls back to number-intact text so barcodes/refs/sizes (`1L`, `1kg`)
  still match, header/contact/total lines never become product lines, **column-layout detection**
  (`designation qty packQty unitprice total`, French `Qté Carton PU HT`, Arabic
  «عدد العبوات») + positional `assignRowColumns` mapping incl. a blank pack cell and packQty
  extraction, **geometric column reader** (`detectColumnStripes` + `assignRowColumnsGeometric`):
  PaddleOCR word boxes are snapped to the nearest declared column stripe (header-word anchors,
  occurrence-aware for «HT Total», with a data-numeric-center fallback) so qty/pack/price/total
  are read by x-position — not number order.
- Verify: build, live smoke with a fixture image. **Vitest 365/365 (20 files, new
  `invoiceOcr.spec.ts` 82 tests)** · tsc clean · build 0 errors, **229 precache entries** · **SW MATCH**.
  (The OCR run itself is lazy + on-device; the `__OCR_TEST_TEXT__` seam covers automated tests.)

## B.5 Camera stock-taking

- Stock-take mode: rapid barcode scan (one camera screen) appends to a live count grid, ±
  steppers on the fly, then generates a stock-adjustment document (reuse the stock-movement
  engine). Works offline → queued.
- Verify: build, SW MATCH, offline flow.

---

# D. WhatsApp Commerce  (THIRD)

> Context: parties have `phone`; portal orders produce a real `CMD`→`FV` document; PDF export
> exists (`runtime/exportPdf.ts`, dompdf WASM). No WhatsApp integration yet — decide
> **click-to-chat (`wa.me` deep links, no API)** for D.1/D.2/D.4-outbound vs the
> **Meta WhatsApp Business Cloud API (webhook)** for D.3/D.4/D.5.

## D.1 Click-to-chat everywhere

- `wa.me` deep links with prefilled Arabic message on: party card, document header, portal order
  row. E.g. `https://wa.me/<phone>?text=<encoded message with doc number + total>`.
- Phone normalization (strip leading 0 / add 213).
- Verify: tsc, build, live smoke (link hrefs correct).

## D.2 Send invoice/statement via WhatsApp

- «أرسل على واتساب» action on a document (and portal order / statement): generate PDF (existing
  export path), produce a shareable link (signed download route), open `wa.me` with the link +
  Arabic caption. Fallback to the web receipt URL when PDF unavailable.
- Verify: build, live smoke.

## D.3 Inbound WhatsApp order intake (webhook)

- Meta WhatsApp Business Cloud API webhook: inbound message → match phone to a party (or portal
  account) → parse a simple order format → create a portal `CMD` order (existing
  `PortalOrderService`) → respond with summary + payment link.
- Requires a business phone + Meta app — sandbox-first, mock webhook for dev.
- Verify: pest tests (webhook signature/messages), build.

## D.4 Order/payment notifications

- Status changes (confirmed → preparing → delivered) and payment confirmations send a WhatsApp
  message when `whatsapp_opt_in = true` (new column + toggle in party form / portal profile).
- Reuse the same template/queue as D.5.
- Verify: pest + build.

## D.5 Reminders + broadcast

- Scheduled task (routes/console.php): remind parties with unpaid balances (or pending portal
  orders) via WhatsApp; admin broadcast composer with opt-out enforcement. `whatsapp_opt_in`
  respected everywhere; unsubscribe link in every message.
- Verify: pest (scheduler test), build.

---

## Progress

| Family | Status | Notes |
|--------|--------|-------|
| B. Camera-native | 🔄 in progress | **B.1 DONE** (`555f5bd` + `ac0d6d9`) — shared `useBarcodeScan` + `title`/`hint`-capable modal, wired into documents form / products / parties with Playwright smoke; follow-up unmounts the hidden duplicate quick-create modal body. **B.2 DONE** (`fff065f` + `a9377d1`) — camera product-photo capture (`CameraCaptureModal`, pending blob preview, upload-on-save, offline info toast) + `pdf-export.pw.spec.ts` fully mocked; Playwright 16/16. **B.3 DONE** (`1dee679`) — `lib/fiscalQr.ts` decoder + square 280×280 scan box (ZXing real-decode fix) + admin documents camera button → exact doc + portal scan-to-track; fiscal-scan.pw.spec.ts 3/3 real-QR E2E; Playwright 19/19, pest portal 25/25. **B.4 DONE** — supplier-invoice photo → OCR prefill → FA (lazy `InvoiceOcrModal` + `lib/invoiceOcr.ts` parser, vitest 365/365). Next **B.5** |
| C. Offline everywhere | ✅ done | **C.1** (offline interception fixed + regression suite) · **C.2** (documents-module offline hardening + field-agent flow test) · **C.3** (prefetch page + indicator integration) · **C.4** (sync dashboard `/offline`) · **C.5** (offline POS Pro Mobile, `314afea`) — all committed + pushed |
| D. WhatsApp commerce | ❌ planned | D.1–D.5 defined; wa.me-first, Meta Cloud API webhook later |

## Commits

Each completed task committed + pushed individually to `origin/main` (stage ONLY that task's
files; leave unrelated dirty files untouched):

| Commit | Contents |
|--------|----------|
| *(ROADMAP creation)* | `ROADMAP.md` + AGENTS.md mention — DONE (`a76ef8b`) |
| *(C.1)* | **DONE** — `queueMath.ts` `isNetworkFailure()` + `client.ts` pre-normalization hook + `offlineAwareApi.ts` hook wiring + `offline-interceptor.spec.ts` regression suite (replaced the probe) |
| *(C.2)* | **DONE** — documents-module offline hardening (`document_number` fallback `?? ''` + «سيُحفظ عند توفر الاتصال» toasts in `useCommercialDocumentController`, `QuickSaleModal`, `CommercialDocumentsPage`, `ReturnsModal`, both return flows) + `offline-doc-flow.spec.ts` field-agent flow test (create→edit+pay→sync temp-url rewrite) |
| *(C.3)* | **DONE** (`2213a28`) — `cacheTtlForUrl` extension + «جهّز للعمل دون اتصال» prefetch (`prepareOffline.ts` `OFFLINE_DATASETS` + prefetch fn), `OfflinePage.tsx`, `OfflineIndicator` rework, route `/offline` |
| *(C.4)* | **DONE** (`95e8920` merge "offline mode") — `SyncDashboard.tsx` (pending/failed op list, per-op + retry-all, مزامنة الآن + last-synced stamp, temp→real id), `useOffline` additions, `sync-dashboard.spec.ts`, route + nav "دون اتصال" |
| *(C.5)* | **DONE** (`314afea`) — offline POS Pro Mobile: last-known-session fallback (localStorage per slug), offline queued toast (`isOfflineQueuedResponse`), appbar cloud sync button + «دون اتصال» chip, «دون اتصال» sidebar entry; verified tsc/273 tests/build 224 precache/SW MATCH |
| *(B.1)* | **DONE** (`555f5bd` + `ac0d6d9`) — shared camera-scan hook + non-POS wiring; follow-up unmounts the hidden duplicate quick-create modal body + repaired `pdf-export` fixture |
| *(B.2)* | **DONE** (`fff065f`) — `CameraCaptureModal.tsx` + `ProductModal` wiring (capture → pending blob preview → upload-on-save with real id; offline-queued create → info toast) + `camera-capture.pw.spec.ts` 2/2; `a9377d1` makes `pdf-export.pw.spec.ts` fully-mocked (Playwright 16/16) |
| *(B.3)* | **DONE** (`1dee679`) — `lib/fiscalQr.ts` decoder (JSON v1, `invoice.number`) + square `280×280` qrbox in `BarcodeScannerModal` (ZXing real-decode fix: landscape 280×140 capped the square QR at 140px and never decoded) + admin documents camera button → exact doc view + portal scan-to-track (`portalApi.orders` `search`, backend matches the converted FV/POS number via `source_document_id`); `fiscal-scan.pw.spec.ts` 3/3 real-QR E2E + Pest portal scan-to-track regression (portal suite 25/25) |
| *(B.4)* | **DONE** (`14fc032` + `ec38053` + `fd3d0d2` + smart-OCR) — supplier-invoice photo → OCR prefill → FA: lazy `InvoiceOcrModal` + pure `lib/invoiceOcr.ts` parser (French/Arabic decimals, Arabic-Indic digits, dates, longest-hit supplier/product matching incl. barcode/ref via number-intact fallback, TVA rate first-number, skip header/total lines) + `CameraCaptureModal` reuse wired into the FA document page (`DocumentLinesSection` «تصوير فاتورة المورد» button, `onApply` → `document_date`/`party_id`/`bulkAddLines`); follow-ups: image preprocessing + drag & drop + re-capture + Arabic OCR status (`ec38053`), robust 3-tier product matching exact→fuzzy→price (`fd3d0d2`), smart-OCR column-layout detection + detected-totals reconciliation + top-3 suggestion picker, OCR engine swap tesseract→`ppu-paddle-ocr` (on-device, `V6_SMALL_MODEL` + `spaceRecovery`, workbox `ocr-models-cache` rules, `OCR_MAX_DIM` 2400) + positional many-column mapping (`assignRowColumns`, packQty extraction) + **geometric column reader** (`detectColumnStripes`/`assignRowColumnsGeometric` — word boxes snapped to column stripes by x-position); `invoiceOcr.spec.ts` 82 tests (vitest 365/365), tsc clean, build 229 precache, SW MATCH |
| *(B.5)* | camera stock-taking → stock adjustment |
| *(D.1)* | wa.me click-to-chat links |
| *(D.2)* | WhatsApp invoice/statement send |
| *(D.3)* | Meta Cloud API inbound webhook → portal order |
| *(D.4)* | WhatsApp status/payment notifications (opt-in) |
| *(D.5)* | reminders + broadcast with opt-out |
