# Remaining Tasks — B (Camera), C (Offline), D (WhatsApp) — Full Actionable List

> **Status: ✅ C.1–C.4 COMPLETE (all committed + pushed).** Pick up on any PC: `git pull`,
> open this file, work task-by-task. **Commit + push after EACH task** (stage ONLY that task's
> files). C is being implemented first (decided with the user), then B, then D.
>
> **Resume point now**: C.1 (offline interception), C.2 (documents-module offline hardening),
> C.3 (offline data readiness / «جهّز للعمل دون اتصال» prefetch page), and C.4 (field-agent
> sync dashboard at `/offline`) are ALL DONE and pushed. Next is **C.5** (offline POS Pro
> Mobile verification/fixes). HEAD is the merge `offline mode` (95e8920) carrying C.4.

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

# C. Offline Everywhere / Field Agents  (FIRST — in progress)

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

## C.5 Offline POS Pro Mobile

- Verify `/pos/pro/mobile` (shares desktop POS Pro cart store + payment pipeline) fully offline:
  session-open guard falls back to last-known session, cart hold/restore, camera scan, payment
  queue, thermal print with `OFFLINE-<n>`, auto-sync on reconnect.
- Fix whatever breaks; field-agent POS is the demo.
- Verify: build + SW MATCH + Playwright offline simulation.

---

# B. Camera-Native Commerce  (SECOND)

> Context: `resources/js/components/BarcodeScannerModal.tsx` (html5-qrcode, environment camera,
> beep + flash on hit) exists, wired only into POS scanbars. Fiscal QR (`qrcode_content`) is
> rendered on FV/POS prints (Phase 69 / upgrade 1) and can be DECODED to reopen a doc. Product
> photo upload exists (`image_url`/upload path).

## B.1 Camera scan everywhere

- Shared `useBarcodeScan()` hook + global camera affordance outside the POS:
  documents form (scan product barcode → add as line), products page (scan → open product),
  parties page (scan party barcode/NIF → open).
- Refactor `BarcodeScannerModal` to accept `title`/`hint` + `onScan` so every page reuses one impl.
- Verify: tsc, build, SW MATCH, Playwright scan-smoke (mock the camera feed).

## B.2 Photograph a product

- In the product create/edit form: capture a photo with the camera (`getUserMedia` → canvas →
  blob → existing upload path) instead of only pasting a URL.
- Local blob preview + upload on save; offline → queue the upload (ties into C).
- Verify: tsc, build, live smoke.

## B.3 Scan printed invoice → reopen the doc

- On the documents page: a camera button that decodes the printed BSC/fiscal QR (`qrcode_content`,
  JSON v1 incl. doc number/reference) and navigates to that exact document.
- Also used by the portal's "scan to track my order".
- Verify: build, live smoke with a printed-QR fixture.

## B.4 Photograph a supplier invoice → book it (OCR)

- Camera capture → OCR (server-side or lazy client OCR lib) → PRE-FILL the purchase doc form
  (supplier, date, lines) for human confirmation before save. OCR is a *prefill* helper — the
  stored doc is still a normal `FA` doc.
- Verify: build, live smoke with a fixture image.

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
| B. Camera-native | ❌ planned | B.1–B.5 defined; start after C |
| C. Offline everywhere | 🚧 in progress | **C.1 DONE** (offline interception fixed + regression suite) · **C.2 DONE** (documents-module offline hardening + field-agent flow test) · **C.3 DONE** (prefetch page + indicator integration) · **C.4 DONE** (sync dashboard `/offline`); **C.5 pending** |
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
| *(C.5)* | offline POS Pro Mobile verification/fixes |
| *(B.1)* | shared camera-scan hook + non-POS wiring |
| *(B.2)* | camera product photo capture |
| *(B.3)* | fiscal-QR → reopen document |
| *(B.4)* | supplier-invoice photo → OCR prefill → FA |
| *(B.5)* | camera stock-taking → stock adjustment |
| *(D.1)* | wa.me click-to-chat links |
| *(D.2)* | WhatsApp invoice/statement send |
| *(D.3)* | Meta Cloud API inbound webhook → portal order |
| *(D.4)* | WhatsApp status/payment notifications (opt-in) |
| *(D.5)* | reminders + broadcast with opt-out |
