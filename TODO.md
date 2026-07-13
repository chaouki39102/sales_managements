# TODO — Missing Frontend Implementations

> Generated: 2026-07-13 | Backend endpoints with no (or orphaned) frontend UI

---

## Priority 1 — Missing (0% frontend, needs full implementation)

### P1.1 Document Approval Workflow
**Backend:** `ApprovalController.php` — 6 endpoints
**Frontend:** None

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /approvals/check/{documentId}` | Check if doc needs approval |
| `POST /approvals/submit/{documentId}` | Submit doc for approval |
| `POST /approvals/{documentId}/approve` | Approve document |
| `POST /approvals/{documentId}/reject` | Reject with reason |
| `GET /approvals/thresholds` | List approval thresholds |
| `POST /approvals/thresholds` | Create/update threshold |

**Plan:**
- [ ] Create `endpoints/approvals.ts` — API functions + hooks
- [ ] Create `components/ApprovalWorkflow.tsx` — approve/reject buttons in document page
- [ ] Create `components/ApprovalThresholdsModal.tsx` — threshold management
- [ ] Add approval status indicator to document list page

---

### P1.2 Document Mail
**Backend:** `DocumentMailController.php` — 1 endpoint
**Frontend:** None

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /documents/{id}/send-mail` | Send document via email |

**Plan:**
- [ ] Create `components/SendDocumentMailModal.tsx` — recipient, subject, body, send
- [ ] Add "Send by Email" button to document detail/action bar

---

### P1.3 Audit Trail
**Backend:** `AuditController.php` — 4 endpoints
**Frontend:** None

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /audits` | List audit logs |
| `GET /audits/{id}` | Show single audit entry |
| `GET /audits/user/{user}` | Filter by user |
| `GET /audits/event/{event}` | Filter by event type |

**Plan:**
- [ ] Create `endpoints/audits.ts` — API functions + hooks
- [ ] Create `pages/audit/AuditLogPage.tsx` — searchable/filterable audit table
- [ ] Add route `/audit-log` to router

---

## Priority 2 — Orphaned (code exists but unreachable)

### P2.1 Bank Reconciliation
**Backend:** `BankReconciliationController.php` — 6 endpoints
**Frontend:** `BankReconciliationPage.tsx` exists but is **never routed**

| Endpoint | Frontend Status |
|----------|----------------|
| `GET /reconciliation/unreconciled` | Called in orphaned component |
| `GET /reconciliation/reconciled` | Called in orphaned component |
| `POST /reconciliation/reconcile` | Called in orphaned component |
| `POST /reconciliation/bulk-reconcile` | **MISSING** |
| `POST /reconciliation/suggest-matches` | **MISSING** |
| `POST /reconciliation/{id}/unreconcile` | **MISSING** |

**Plan:**
- [ ] Move `BankReconciliationPage.tsx` to `pages/finance/` or `pages/reconciliation/`
- [ ] Add route to router
- [ ] Add missing API functions (`bulkReconcile`, `suggestMatches`, `unreconcile`)
- [ ] Add reconcile-all button + suggest-matches button to UI

---

### P2.2 Alerts System
**Backend:** `AlertController.php` — 6 endpoints
**Frontend:** `useAlerts.ts` + `AlertBell.tsx` exist but are **never rendered**

| Endpoint | Frontend Status |
|----------|----------------|
| `GET /alerts/unread` | Called in orphaned hook |
| `POST /alerts/{id}/read` | Called in orphaned hook |
| `POST /alerts/mark-all-read` | Called in orphaned hook |
| `GET /alerts/all` | **MISSING** |
| `GET /alerts/count` | **MISSING** |
| `POST /alerts/run-daily` | **MISSING** |

**Plan:**
- [ ] Integrate `AlertBell.tsx` into the topbar (alongside NotificationBell)
- [ ] Create `pages/alerts/AlertsPage.tsx` — list all alerts
- [ ] Add missing API functions + hooks
- [ ] Add route to router

---

## Priority 3 — Missing UI (hooks exist, no page)

### P3.1 Product Lots Page
**Backend:** `ProductLotController.php` — 7 endpoints (CRUD + `available` + `expiring`)
**Frontend:** Hooks defined in `inventory.ts` but **never imported by any page**

**Plan:**
- [ ] Create `pages/inventory/ProductLotsTab.tsx` — tab in InventoryPage
- [ ] Show expiring lots alert
- [ ] Show available lots per product/warehouse
- [ ] Wire navigation from InventoryPage tabs

---

## Priority 4 — Minor gaps

### P4.1 Exchange Rate Latest
**Backend:** `ExchangeRateController::latest()` — `GET /exchange-rates/latest`
**Frontend:** No consumer (only list endpoint used)

**Plan:**
- [ ] Add `latest()` to `lookups.ts` exchange rate API
- [ ] Use in document creation (auto-fill exchange rate for foreign currencies)

---

### P4.2 Document Compute Totals
**Backend:** `DocumentComputeController::computeTotals()` — `POST /documents/compute-totals`
**Frontend:** Not called (all other compute endpoints are used)

**Plan:**
- [ ] Add `computeTotals` function to documents API
- [ ] Use in document form when batch-editing lines

---

### P4.3 Attachment Management
**Backend:** `AttachmentController.php` — 3 endpoints
**Frontend:** Only `POST /attachments` used for logo upload in setup wizard

| Endpoint | Frontend Status |
|----------|----------------|
| `POST /attachments` | Used (logo only) |
| `GET /attachments` (list) | **MISSING** |
| `GET /attachments/{id}/download` | **MISSING** |

**Plan:**
- [ ] Add attachment list + download to document detail view
- [ ] Show attached files in document sidebar

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P1 — Full implementation needed | 3 | Approval, Mail, Audit |
| P2 — Orphaned code to integrate | 2 | Reconciliation, Alerts |
| P3 — UI missing, hooks exist | 1 | Product Lots |
| P4 — Minor gaps | 3 | Exchange rate, Compute totals, Attachments |
| **Total** | **9** | |

## Estimated Complexity

| Feature | New Files | Estimated Lines | Difficulty |
|---------|-----------|-----------------|------------|
| Approval Workflow | 3 | ~400 | Medium |
| Document Mail | 2 | ~150 | Low |
| Audit Trail | 2 | ~300 | Medium |
| Bank Reconciliation | 2 (move + complete) | ~200 | Medium |
| Alerts | 2 | ~250 | Low |
| Product Lots | 1 | ~200 | Low |
| Exchange Rate Latest | 1 (extend) | ~30 | Trivial |
| Compute Totals | 1 (extend) | ~30 | Trivial |
| Attachment Management | 1 | ~100 | Low |
