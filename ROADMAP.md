# Product Roadmap — "Better Than SAP/Odoo" Features

> **Status: 🚧 IN PROGRESS (Aug 9) — section C (offline everywhere / field agents) is being
> implemented first (decided with the user; B and D follow in order).** Pick up on any PC:
> `git pull`, open this file, and work task-by-task. Commit + push after EACH task.

> **Goal**: beat SAP/Odoo not on module count but on speed-to-value, mobile/offline-first,
> built-in Algerian fiscal compliance (BSC QR, G50/G12, IFU, fiscal stamp, fiscal-year engine,
> NIF validation, DGI e-invoicing), AI, and price. Three feature families, each self-contained
> and demoable end-to-end:
> **B — Camera-native commerce** (the shop floor lives on the camera, not the keyboard),
> **C — Offline everywhere / field agents** (the app works with NO connection and syncs when
> it returns), **D — WhatsApp commerce** (orders and statements move over the same chat the
> customer already uses).

## Global verification (run after every task)

- `npx tsc --noEmit` — clean
- `npm test` — all pass (offline suites must stay green: `resources/js/lib/offline/__tests__/`)
- `npm run build` — 0 errors
- **SW MATCH**: `(Get-FileHash public/sw.js -Algorithm SHA256).Hash` must equal
  `(Get-FileHash public/build/sw.js -Algorithm SHA256).Hash`
- `vendor\bin\pest.bat` (backend) — all pass when PHP files touched
- Live smoke via Playwright Chromium (fresh browser, fresh token) — zero console/page errors

---

## B. Camera-Native Commerce

> **Goal**: the camera becomes the primary input device — scan a barcode to sell, photograph a
> product to create it, scan a printed invoice to reopen it, photograph a supplier invoice to
> book it, point at a shelf to take stock. This is the "phone-native, faster than SAP" demo.
>
> **Context to reuse**: `resources/js/components/BarcodeScannerModal.tsx` (html5-qrcode,
> `Html5Qrcode`, environment-facing camera, beep + flash on hit) exists but is only wired into
> the POS scanbars. The fiscal QR payload (`qrcode_content`) is already rendered on FV/POS
> prints (Phase 69 / upgrade 1) and can be DECODED to reopen a document. Product photo upload
> exists in the product form (`image_url`/upload path).

- [ ] **B.1 Camera scan everywhere** — a shared `useBarcodeScan()` hook + a global camera
      affordance so scanning works OUTSIDE the POS: the documents form (scan a product
      barcode → add that product as a line), the products page (scan → open that product),
      the parties page (scan a party barcode/NIF → open). Refactor `BarcodeScannerModal` to
      accept a `title`/`hint` + `onScan` so every page reuses one implementation.
- [ ] **B.2 Photograph a product** — in the product create/edit form, capture a photo with
      the camera (`getUserMedia` → canvas → blob → existing upload path) instead of only
      pasting a URL. Store the local blob preview + upload on save; offline → queue the upload.
- [ ] **B.3 Scan printed invoice → reopen the doc** — on the documents page, a camera button
      that decodes the printed BSC/fiscal QR (`qrcode_content`, JSON v1: includes the doc
      number/reference) and navigates to that exact document. Also used by the portal's
      "scan to track my order".
- [ ] **B.4 Photograph a supplier invoice → book it (OCR)** — camera capture → OCR
      (server-side or a lazy client OCR lib) → pre-fill the purchase document form
      (supplier, date, lines) for human confirmation before save. OCR is a *prefill* helper —
      the user always confirms; the stored document is still a normal `FA` doc.
- [ ] **B.5 Camera stock-taking** — a stock-take mode: rapid barcode scan (one camera screen)
      appends to a live count grid, ± steppers on the fly, then generates a stock-adjustment
      document (reuse the existing stock-movement engine). Works offline → queued (ties into C).

## C. Offline Everywhere / Field Agents

> **Goal**: everything the POS already does offline (upgrade 5: write queue, rich 202
> optimistic ack, sync engine, stale-data badge) must extend to the WHOLE app — field agents
> create invoices, purchases, and orders from the road with no connection, and the queue
> syncs when coverage returns. Never silently lose a save; never drop a conflict.
>
> **Context to reuse**: `resources/js/lib/offline/` — `db.ts` (IndexedDB write queue,
> `PendingOp`, FIFO `id ASC`, verbatim method+url), `offlineAwareApi.ts` (interceptor: queues
> mutations + serves cached GETs, URL-aware TTL, reactive stale signal), `syncEngine.ts`
> (`replayPendingOps` FIFO + `tempId→realId` + `resolveOpUrl`, `isPermanent` 4xx vs retryable,
> `MAX_RETRIES=3`), `useOffline.ts` (`useSync` auto-sync on `online`, `retryFailedOps`,
> `useFailedOps`), `queueMath.ts` (pure totals/guards). **Known gap**: the interceptor only
> engages when `navigator.onLine === false` — useless for a field agent whose browser says
> "online" while the server is unreachable (timeout / DNS / connection refused).

- [x] **C.1 Any network failure = offline (server-unreachable) — DONE `(commit)`** — new pure
      predicate `isNetworkFailure(error)` in `queueMath.ts`: TRUE only when axios reports a
      network-category error code (ERR_NETWORK, ECONNABORTED/ETIMEDOUT timeouts, connection
      refused/reset, DNS/ENOTFOUND, empty response…) AND the server never answered
      (`error.response` absent); FALSE for real HTTP errors (4xx/5xx — must surface), axios
      cancellations (`ERR_CANCELED`/aborts), and client-config errors (ERR_BAD_OPTION…). The
      interceptor's mutation branch queues AND its GET branch serves the cache when
      `isNetworkFailure(error) || !navigator.onLine` — so a field agent on a flaky/blocked link
      keeps creating/editing documents with the queue + optimistic 202 instead of losing work.
      Test: `__tests__/offline-math.spec.ts` extended (or new suite) for the code allowlist
      (timeout → queue; ERR_CANCELED → no; 422 → no; no-code-with-request → queue).
- [ ] **C.2 Documents module offline** — verify + harden the commercial-document create/edit
      flow (classic form `useCommercialDocumentController.saveMut` PUT-via-`documentId`,
      `QuickSaleModal`, returns) against the queued 202 shape: `document_number` fallback
      (`?? ''`), no navigation to a temp id, offline-aware success toast («سيُحفظ عند توفر
      الاتصال»), and `OFFLINE-<n>` receipt print keeps working. Replay already rewrites
      `PUT /documents/<temp>` → real id via `resolveOpUrl` — confirm with a field-agent flow
      (create → edit → pay → sync).
- [ ] **C.3 Offline data readiness for the field** — longer cache TTLs for field-critical
      GETs (parties, products list, stock-at already 30 min) via `cacheTtlForUrl`, plus a
      **«جهّز للعمل دون اتصال»** button that prefetches + caches the essentials (products,
      parties, price levels, warehouse stock) so an agent can leave coverage with data.
      Show cache-freshness per dataset in the offline indicator.
- [ ] **C.4 Field-agent sync dashboard** — a dedicated page (`/offline` or inside settings):
      pending ops list (method/url/target + time), failed ops with Arabic `lastError` +
      per-op retry + «إعادة المحاولة للكل», a «مزامنة الآن» button + last-synced stamp,
      and temp→real id resolution display. Reuse `useFailedOps`/`getPendingOps`; the existing
      `OfflineIndicator` popover stays the quick glance.
- [ ] **C.5 Offline POS Pro Mobile** — verify `/pos/pro/mobile` (which shares the desktop POS
      Pro cart store + payment pipeline) fully offline: session-open guard falls back to a
      last-known session, cart hold/restore, camera scan, payment queue, thermal print with
      `OFFLINE-<n>` number, and auto-sync on reconnect. Field-agent POS is the demo.

## D. WhatsApp Commerce

> **Goal**: sell where the customer already talks to you. Click-to-chat on every order, send
> the invoice/statement over WhatsApp, receive orders from a chat message, notify on status
> change, and remind on unpaid balances — with explicit per-party opt-in (no spam).
>
> **Context to reuse**: parties have `phone`; the portal order flow produces a real `CMD`→`FV`
> document; PDF export already exists (`runtime/exportPdf.ts`, dompdf WASM). No WhatsApp
> integration exists yet — decide between **click-to-chat (`wa.me` deep links, no API)** for
> D.1/D.2/D.4-outbound and the **Meta WhatsApp Business Cloud API (webhook)** for D.3/D.4/D.5.

- [ ] **D.1 Click-to-chat everywhere** — `wa.me` deep links with a prefilled Arabic message on:
      party card, document header, portal order row. E.g.
      `https://wa.me/<phone>?text=<encoded message with doc number + total>` — zero API, works
      on any phone with WhatsApp installed. Phone normalization (strip leading 0 / add 213).
- [ ] **D.2 Send invoice/statement via WhatsApp** — «أرسل على واتساب» action on a document
      (and the portal order / statement): generate the PDF (existing export path), produce a
      shareable link (signed download route), and open `wa.me` with the link + Arabic caption.
      Falls back to sending the web receipt URL when PDF generation is unavailable.
- [ ] **D.3 Inbound WhatsApp order intake (webhook)** — Meta WhatsApp Business Cloud API
      webhook receives an inbound message → match the phone number to a party (or portal
      account) → parse a simple order format (e.g. lines via a reply-flow / catalog numbers) →
      create a portal `CMD` order (existing `PortalOrderService`) → respond with a summary
      + payment link. Requires a business phone number + Meta app — sandbox-first, mock
      webhook for dev.
- [ ] **D.4 Order/payment notifications** — status changes (confirmed → preparing → delivered)
      and payment confirmations (webhook from upgrade 3) send a WhatsApp message to the
      party's phone when `whatsapp_opt_in = true` (new column + toggle in the party form /
      portal profile). Reuse the same template/queue as D.5.
- [ ] **D.5 Reminders + broadcast** — a scheduled task (routes/console.php) that reminds
      parties with unpaid balances (or portal orders still pending payment) via WhatsApp, plus
      an admin broadcast composer with opt-out enforcement. `whatsapp_opt_in` respected
      everywhere; unsubscribe link in every message.

---

## Progress

| Family | Status | Notes |
|--------|--------|-------|
| B. Camera-native | ❌ planned | B.1–B.5 tasks defined; start after C (chosen order B→C→D, but C implemented first) |
| C. Offline everywhere | 🚧 in progress | C.1 done (any network failure = offline); C.2–C.5 pending |
| D. WhatsApp commerce | ❌ planned | D.1–D.5 tasks defined; wa.me-first, Meta Cloud API webhook later |

## Commits

Each completed task must be committed + pushed individually to `origin/main` (stage ONLY the
files belonging to that task; leave unrelated dirty files untouched):

| Commit | Contents |
|--------|----------|
| *(ROADMAP creation)* | `ROADMAP.md` (this file) + AGENTS.md mention |
| *(C.1)* | `queueMath.ts` `isNetworkFailure()` predicate + `offlineAwareApi.ts` interceptor gate (`isNetworkFailure(error) \|\| !navigator.onLine`) + tests |
| *(C.2)* | documents-module offline hardening + field-agent flow verification |
| *(C.3)* | `cacheTtlForUrl` extension + «جهّز للعمل دون اتصال» prefetch |
| *(C.4)* | field-agent sync dashboard |
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
