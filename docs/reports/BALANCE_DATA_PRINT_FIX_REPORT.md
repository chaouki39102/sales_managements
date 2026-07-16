# BALANCE_DATA_PRINT_FIX_REPORT.md

## Phase 23 — Balance Data Print Fix (July 16, 2026)

---

## 1. Problem Statement

The delivery receipt (A5 BL) showed **wrong balance values** compared to the document page:

| Field | Receipt (wrong) | Doc Page (correct) |
|-------|----------------|-------------------|
| الدين القديم (previous balance) | -4,970.40 | 57.04 |
| الرصيد الجديد (new balance) | 57.04 | 57.04 |

The receipt was computing `previous_balance = current_balance - net_to_pay` (reversing the document's effect), but `PartyBalanceService::getBalanceAt()` already includes this document's effect when queried at its own date. The doc page shows the same value for both "رصيد الحالي" and "بعد هذا المستند", but the receipt showed different values.

Additionally, `balance_data` was only attached in `show()`, not in `store()` or `update()` — so newly saved documents returned via those endpoints lacked balance data entirely.

---

## 2. Root Cause Analysis

### 2.1 Backend: `attachBalanceData()` Reversal Formula

`PartyBalanceService::getBalanceAt($partyId, $date)` queries:

```sql
WHERE document_date <= :date  -- includes THIS document
```

So `current_balance` already includes this document's effect. The old formula tried to reverse it:

```php
// WRONG — getBalanceAt() already includes this doc
$previousBalance = $isSale
    ? $currentBalance - $doc->net_to_pay
    : $currentBalance + $doc->net_to_pay;
```

For a 5,027.44 DZD sale where `current_balance = 57.04`:
- `previous_balance = 57.04 - 5027.44 = -4,970.40` (WRONG)
- `new_balance = 57.04`

But the doc page shows:
- `رصيد الحالي: 57.04` (= `partyBalance.current_balance`)
- `بعد هذا المستند سيصبح: 57.04` (= `futureBalance`, same because no modifications)

### 2.2 Frontend: Missing Fallback Props

`TemplatePrintModal` had no `prevBalance`/`newBalance` props. When `balance_data` was absent from the document (e.g., loaded from list endpoint which doesn't call `attachBalanceData()`), the receipt had no fallback — `balance` was `null`.

### 2.3 Backend: `balance_data` Only in `show()`

`attachBalanceData()` was only called in `show()`. The base class `store()` and `update()` inherited from `BaseApiController` did not call it — so newly saved documents returned via POST/PUT lacked `balance_data`.

---

## 3. Changes Made

### 3.1 Backend: `CommercialDocumentController.php`

#### 3.1.1 Fix `attachBalanceData()` — Remove Reversal

**File:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:491-509`

**Before:**
```php
private function attachBalanceData(CommercialDocument $doc): void
{
    if (!$doc->party_id || !$doc->document_date) return;
    try {
        $balanceData = $this->partyBalanceService->getBalanceAt(
            $doc->party_id,
            $doc->document_date
        );
        $currentBalance = $balanceData['current_balance'];

        $doc->loadMissing('documentType.documentBaseOperation');
        $isSale = $doc->documentType?->documentBaseOperation?->name === 'sale';

        $previousBalance = $isSale
            ? $currentBalance - $doc->net_to_pay
            : $currentBalance + $doc->net_to_pay;

        $doc->balance_data = [
            'previous_balance' => round($previousBalance, 2),
            'new_balance'      => round($currentBalance, 2),
        ];
    } catch (\Throwable) {
        $doc->balance_data = null;
    }
}
```

**After:**
```php
private function attachBalanceData(CommercialDocument $doc): void
{
    if (!$doc->party_id || !$doc->document_date) return;
    try {
        $balanceData = $this->partyBalanceService->getBalanceAt(
            $doc->party_id,
            $doc->document_date
        );
        $currentBalance = $balanceData['current_balance'];

        // getBalanceAt() queries whereDate('document_date', '<=', $date),
        // which already includes this document's effect.
        // Both values match what the doc page shows:
        //   رصيد الحالي = current_balance
        //   بعد هذا المستند = current_balance (no delta for saved doc)
        $doc->balance_data = [
            'previous_balance' => round($currentBalance, 2),
            'new_balance'      => round($currentBalance, 2),
        ];
    } catch (\Throwable) {
        $doc->balance_data = null;
    }
}
```

**Reason:** `getBalanceAt()` uses `whereDate('<=', $date)` which already includes this document. Both the "previous" and "new" balance for a saved doc at its own date are the same — the doc page confirms this with identical values for "رصيد الحالي" and "بعد هذا المستند".

#### 3.1.2 Add `store()` Override

**File:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:268-283`

**Before:** Not present (inherited from `BaseApiController::store()`)

**After:**
```php
public function store(Request $request): JsonResponse
{
    try {
        $this->authorizeAction('create', $this->getModelClass());
        $data = $this->getValidatedData($request);
        $item = $this->getService()->create($data, $request);
        $this->attachBalanceData($item);
        return $this->successResponse(
            $this->transformItem($item),
            "تم إنشاء {$this->resourceName} بنجاح",
            201
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'store');
    }
}
```

**Reason:** Newly created documents now have `balance_data` in the API response, so the print modal can display correct balance values immediately after save without a separate `show()` call.

#### 3.1.3 Add `update()` Override

**File:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:285-301`

**Before:** Not present (inherited from `BaseApiController::update()`)

**After:**
```php
public function update(Request $request, $id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $item       = $this->getService()->findById($resolvedId);
        $this->authorizeAction('update', $item);
        $data = $this->getValidatedData($request, $resolvedId);
        $item = $this->getService()->update($item, $data, $request);
        $this->attachBalanceData($item);
        return $this->successResponse(
            $this->transformItem($item),
            "تم تحديث {$this->resourceName} بنجاح"
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'update');
    }
}
```

**Reason:** Updated documents now return `balance_data` in the response.

---

### 3.2 Frontend: `TemplatePrintModal.tsx`

**File:** `resources/js/pages/settings/print-settings/components/shared/TemplatePrintModal.tsx`

#### 3.2.1 Add `prevBalance`/`newBalance` Props

**Before (interface):**
```tsx
interface TemplatePrintModalProps {
  open:        boolean;
  onClose:     () => void;
  document?:   ApiDocument;
  company:     CompanyData;
  templates?:  PrintTemplate[];
  template?:   PrintTemplate;
  docTypeCode: string;
  data?:       UniversalDocumentData;
}
```

**After:**
```tsx
interface TemplatePrintModalProps {
  open:        boolean;
  onClose:     () => void;
  document?:   ApiDocument;
  company:     CompanyData;
  templates?:  PrintTemplate[];
  template?:   PrintTemplate;
  docTypeCode: string;
  /** Pre-built data (bypasses fromApiDocument when provided) */
  data?:       UniversalDocumentData;
  /** Fallback balance when document.balance_data is absent (e.g., from list endpoint) */
  prevBalance?: number;
  newBalance?:  number;
}
```

#### 3.2.2 Pass Options Through to Source

**Before:**
```tsx
function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData }: TemplatePrintModalProps) {
  // ...
  const source = useMemo(() => {
    if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
    if (document) return { type: 'api-document' as const, doc: document, company };
    return null;
  }, [overrideData, document, company]);
```

**After:**
```tsx
function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData, prevBalance, newBalance }: TemplatePrintModalProps) {
  // ...
  const source = useMemo(() => {
    if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
    if (document) return { type: 'api-document' as const, doc: document, options: { prevBalance, newBalance } };
    return null;
  }, [overrideData, document, prevBalance, newBalance]);
```

**Reason:** Balance fallback values flow through the pipeline source → `DocumentDataBuilder.fromApiDocument(doc, company, options)`. When `doc.balance_data` is present (from `show()`/`store()`/`update()`), it takes priority. When absent (e.g., from list endpoint), the `options` fallback is used.

---

### 3.3 Frontend: `CommercialDocumentModal/index.tsx`

**File:** `resources/js/pages/documents/CommercialDocumentModal/index.tsx:508-523`

**Before:**
```tsx
{printModalOpen && existingDocument && companyInfo && (
  <Suspense fallback={null}>
    <TemplatePrintModal
      open={printModalOpen}
      onClose={() => setPrintModalOpen(false)}
      document={existingDocument as Record<string, unknown>}
      company={companyInfo as any}
      template={selectedTemplate || undefined}
      templates={printTemplates}
      docTypeCode={docCode}
    />
  </Suspense>
)}
```

**After:**
```tsx
{printModalOpen && existingDocument && companyInfo && (
  <Suspense fallback={null}>
    <TemplatePrintModal
      open={printModalOpen}
      onClose={() => setPrintModalOpen(false)}
      document={existingDocument as Record<string, unknown>}
      company={companyInfo as any}
      template={selectedTemplate || undefined}
      templates={printTemplates}
      docTypeCode={docCode}
      prevBalance={partyBalance?.current_balance ?? 0}
      newBalance={partyBalance?.current_balance ?? 0}
    />
  </Suspense>
)}
```

**Reason:** Passes the party balance (from `useDocumentForm` → `/party-balances/{id}` API) as both `prevBalance` and `newBalance`, matching the doc page behavior where both "رصيد الحالي" and "بعد هذا المستند" show the same value for an unchanged document.

---

### 3.4 Frontend: `CommercialDocumentPage.tsx`

**File:** `resources/js/pages/documents/CommercialDocumentPage.tsx:457-471`

**Before:**
```tsx
{printModalOpen && existingDoc && companyInfo && (
  <Suspense fallback={null}>
    <TemplatePrintModal
      open={printModalOpen}
      onClose={() => setPrintModalOpen(false)}
      document={existingDoc as Record<string, unknown>}
      company={companyInfo as any}
      template={selectedTemplate || undefined}
      templates={printTemplates}
      docTypeCode={docCode}
    />
  </Suspense>
)}
```

**After:**
```tsx
{printModalOpen && existingDoc && companyInfo && (
  <Suspense fallback={null}>
    <TemplatePrintModal
      open={printModalOpen}
      onClose={() => setPrintModalOpen(false)}
      document={existingDoc as Record<string, unknown>}
      company={companyInfo as any}
      template={selectedTemplate || undefined}
      templates={printTemplates}
      docTypeCode={docCode}
      prevBalance={partyBalance?.current_balance ?? 0}
      newBalance={partyBalance?.current_balance ?? 0}
    />
  </Suspense>
)}
```

**Reason:** Same as Modal — wired from `useCommercialDocumentController` → `partyBalance`.

---

## 4. Data Flow (After Fix)

```
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND                                                             │
│                                                                     │
│  show() / store() / update()                                        │
│       │                                                             │
│       ▼                                                             │
│  attachBalanceData()                                                │
│       │                                                             │
│       ▼                                                             │
│  PartyBalanceService::getBalanceAt(party_id, document_date)         │
│       │                                                             │
│       ▼                                                             │
│  WHERE document_date <= :date  ← includes this doc                  │
│       │                                                             │
│       ▼                                                             │
│  current_balance = 57.04                                            │
│       │                                                             │
│       ▼                                                             │
│  balance_data = {                                                   │
│    previous_balance: 57.04,  ← same as current (no reversal)       │
│    new_balance: 57.04         ← same as current (no delta)         │
│  }                                                                  │
│       │                                                             │
│       ▼                                                             │
│  CommercialDocumentResource serializes balance_data                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                            │
│                                                                     │
│  API Response: { ..., balance_data: { previous_balance, new_balance } }
│       │                                                             │
│       ▼                                                             │
│  TemplatePrintModal receives:                                       │
│    document = existingDoc (has balance_data from show/store/update) │
│    prevBalance = partyBalance.current_balance (fallback)            │
│    newBalance  = partyBalance.current_balance (fallback)            │
│       │                                                             │
│       ▼                                                             │
│  UniversalPrintPipeline → DocumentDataBuilder.fromApiDocument()     │
│       │                                                             │
│       ├── doc.balance_data exists? → use it (SSOT)                  │
│       └── doc.balance_data absent? → use options fallback           │
│       │                                                             │
│       ▼                                                             │
│  buildBalance(prev, next) → {                                       │
│    previous: 57.04,                                                │
│    movement: 0,           ← 57.04 - 57.04 = 0                     │
│    current:  57.04                                               │
│  }                                                                  │
│       │                                                             │
│       ▼                                                             │
│  DeliveryReceiptA5 renders:                                         │
│    الدين القديم = data.balance.previous = 57.04  ✓                │
│    الرصيد الجديد = data.balance.current = 57.04   ✓                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Balance Calculation Truth Table

| Scenario | `getBalanceAt()` returns | `balance_data` | Receipt shows | Doc page shows |
|----------|--------------------------|----------------|---------------|----------------|
| Existing doc, no modifications | `current_balance` (includes this doc) | `{ prev: 57.04, new: 57.04 }` | القديم=57.04, الجديد=57.04 | الحالي=57.04, سيصبح=57.04 |
| New doc (just saved) | `current_balance` (includes this doc) | `{ prev: X, new: X }` | same | same |
| From list endpoint (no `show()`) | N/A | null | Falls back to `partyBalance.current_balance` | N/A |
| POS snapshot | N/A | N/A | Uses `snapshot.prevBalance`/`newBalance` | N/A |

---

## 6. Files Modified

| # | File | Change |
|---|------|--------|
| 1 | `app/Http/Controllers/Api/V1/CommercialDocumentController.php` | Fixed `attachBalanceData()` formula; added `store()` and `update()` overrides |
| 2 | `resources/js/pages/settings/print-settings/components/shared/TemplatePrintModal.tsx` | Added `prevBalance?`/`newBalance?` props; passes as `options` to pipeline source |
| 3 | `resources/js/pages/documents/CommercialDocumentModal/index.tsx` | Wired `partyBalance?.current_balance` as both `prevBalance` and `newBalance` |
| 4 | `resources/js/pages/documents/CommercialDocumentPage.tsx` | Same wiring as Modal |

## 7. Files NOT Modified (Read-Only Reference)

| File | Role |
|------|------|
| `app/Services/PartyBalanceService.php` | SSOT for balance computation — `getBalanceAt()` uses `WHERE date <= :date` |
| `app/Http/Resources/CommercialDocumentResource.php` | Serializes `balance_data` from model |
| `resources/js/pages/settings/print-settings/types/data/DocumentDataBuilder.ts` | Already has fallback logic: `doc.balance_data` → `options` |
| `resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx` | Already passes `source.options` to `fromApiDocument()` |
| `resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx` | Doc page balance display — uses `partyBalance.current_balance` |
| `resources/js/pages/documents/hooks/useDocumentForm.ts:642` | Fetches `partyBalance` from `/party-balances/{id}?date=...` |

## 8. Verification

- **PHP Syntax:** `php -l CommercialDocumentController.php` — No syntax errors
- **Build:** `npm run build` — 0 errors, 1080 modules, 2.33s
- **Tests:** `npm test` — 158/158 pass (741ms)

## 9. Key Architecture Principle

> **Backend SSOT for balance computation.** The frontend never calculates balance values — it displays what the backend provides. `PartyBalanceService::getBalanceAt()` is the single source of truth. `attachBalanceData()` enriches the document response with balance context. The print pipeline reads `doc.balance_data` first, falling back to caller-provided `options` only when the backend data is absent.
