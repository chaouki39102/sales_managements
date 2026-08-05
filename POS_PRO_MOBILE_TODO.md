# POS Pro Mobile — Task Checklist

> **Goal**: Integrate `pos-pro-mobile-live.html` (mockup v5) as a real mobile order page at
> `/pos/pro/mobile` in `resources/js/pos-pro/POSProMobilePage.tsx` — full-screen phone layout
> (bottom bar, FAB, sheets) reusing `usePosProCart`, `ProfessionalPaymentModal`, and the
> existing product/party/payment/print data layer. Desktop POS Pro stays untouched.

## Tasks

- [x] **1. Read the desktop data layer** — `POSProPage.tsx` lookups/session/settings/complete-sale/payment wiring, `usePosPro`/`usePosProCart` API surface, mockup body+CSS.
- [x] **2. Mobile CSS** — create `resources/css/theme/pos-pro-mobile.css` (namespaced `.ppm-*`) and import it in `resources/css/app.css`.
- [ ] **3. `POSProMobilePage.tsx` shell** — session guard, `usePOSAggregatedLookups`, `useCurrentPosSession`, `usePosPro`, `.screen` layout, offline/session-lock overlays.
- [ ] **4. Appbar + session strip** — customer chip (name + balance), held-sales badge button.
- [ ] **5. Total card + quick-actions strip** — TTC total, sub/discount/TVA/stamp chips, خصم/تعليق actions.
- [ ] **6. Cart list** — swipe-to-delete + undo snackbar, qty steppers, just-added flash, empty state.
- [ ] **7. FAB + bottombar** — new sale (hold), quick pay (cash), pay → `ProfessionalPaymentModal`.
- [ ] **8. Product sheet** — search + categories + 2-column grid, stock guards (`isVariantOutOfStock`), swatches.
- [ ] **9. Customer sheets** — view (avatar/phone/balance) + select (search real parties), pinned clients.
- [ ] **10. Discount sheet** — %/amount toggle, presets, custom input → invoice discount with PIN gate.
- [ ] **11. Held-sales sheet** — list held carts, resume/delete.
- [ ] **12. Payment + post-sale** — PUT/POST via cart-store `documentId`, receipt/print (`ProfessionalReceipt`), success overlay, cart reset.
- [ ] **13. Route** — register `/pos/pro/mobile` (standalone full-screen, `RequireCompany`) in `routes/index.tsx`.
- [ ] **14. Verification** — `npx tsc --noEmit`, `npm test`, `npm run build`, SW MATCH (`Get-FileHash public/sw.js` vs `public/build/sw.js`).
- [ ] **15. Docs** — record Phase 65 in `AGENTS.md`.

## Progress

| Task | Status | Notes |
|------|--------|-------|
| 1 | done | read before this checklist was created |
| 2 | done | CSS file + app.css import committed |
| 3–15 | pending | ... |

## Commits

Each completed task is committed + pushed individually (`git add` only the files belonging to
that task; the unrelated dirty portal/service files in the worktree are left untouched).
