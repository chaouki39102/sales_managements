# Fiscal Stamp Full Audit Report — July 16, 2026

## Executive Summary

**8 independent implementations** of the fiscal stamp calculation exist across the codebase (4 backend, 4 frontend). They disagree on **3 critical parameters**: threshold, rounding method, and minimum stamp. Additionally, the delivery receipt (BL) balance is **broken** due to `affects_accounting = false` causing negative `previousBalance`.

| # | Error | Severity | Impact |
|---|-------|----------|--------|
| 1 | BL receipt shows `prevBalance = -5950`, `totalAmount = 0` | **CRITICAL** | All BL prints with stamp show wrong totals |
| 2 | `ComputeLineService` uses 30,000 threshold + `ceil`, `FiscalStampCalculator` uses no threshold + `round` | **HIGH** | Backend calculator preview ≠ saved value |
| 3 | `document.utils.ts` uses 30,000 threshold + `ceil`, `calculations.ts` uses no threshold + `round` | **HIGH** | Document form shows different stamp than POS |
| 4 | `QuickSaleModal.tsx` hardcodes 30,000 threshold + `ceil` (4th duplicate) | **HIGH** | QuickSale stamp ≠ POS stamp |
| 5 | `excelExportAdvanced.ts` missing `MIN_STAMP = 5` | **MEDIUM** | Small invoices export stamp as 2 instead of 5 |
| 6 | `FiscalStampService` writes to non-existent `stamp_amount` column | **MEDIUM** | Dead code path, `total_stamp` never updated |
| 7 | Rounding inconsistency: `round(x,2)` vs `round(x,4)` vs `ceil` across services | **LOW** | Sub-cent differences in totals |
| 8 | `FiscalStampService` reads `fiscal_stamps` table (tiered rules), `FiscalStampCalculator` uses hardcoded 1% (flat) | **LOW** | Two completely different systems coexist |

---

## Error #1 (CRITICAL): BL Receipt Balance Broken

### Symptom (User Report)
```
المبلغ TTC:      5 950.00
الدين القديم:    -5 950.00
المجموع:          0.00
المدفوع:          0.00
الرصيد الجديد:   (missing/NaN)
```

### Root Cause

`attachBalanceData()` (`CommercialDocumentController.php:491-515`) computes:
```php
$previousBalance = $currentBalance - $doc->net_to_pay; // for sales
```

`PartyBalanceService::getBalanceAt()` filters by `dt.affects_accounting = true` (line 47). BL has `affects_accounting = false` (DocumentTypeSeeder line 22). So:

| Step | Value | Explanation |
|------|-------|-------------|
| `documents_balance` | **0** | BL excluded by `affects_accounting = true` filter |
| `payments_total` | **0** | No prior payments |
| `currentBalance` | **0** | `opening + documents - payments = 0` |
| `previousBalance` | **−5950** | `0 − 5950 = −5950` ← BUG: subtracts net_to_pay that was never in the balance |
| `totalAmount` | **0** | `5950 + (−5950) = 0` ← Receipt shows zero total |

### Correct Behavior

For a non-accounting document (BL, DEV, BCC, etc.), `previousBalance` should equal `currentBalance` (the old debt doesn't include this document because it doesn't affect accounting). The receipt should show:
```
المبلغ TTC:      5 950.00
الدين القديم:    0.00       ← correct: no prior accounting debt
المجموع:         5 950.00   ← correct: TTC + prev
المدفوع:         0.00
الرصيد الجديد:   5 950.00   ← correct
```

### Fix Required

In `attachBalanceData()`, only subtract `net_to_pay` from `currentBalance` when the document `affects_accounting`:
```php
$isAccounting = $doc->documentType?->affects_accounting ?? true;

$previousBalance = $isAccounting
    ? ($isSale ? $currentBalance - $doc->net_to_pay : $currentBalance + $doc->net_to_pay)
    : $currentBalance; // non-accounting doc: old debt = current balance as-is
```

---

## Error #2 (HIGH): Backend `ComputeLineService` ≠ `FiscalStampCalculator`

### `FiscalStampCalculator::calculate()` — The Canonical Calculator
**File:** `app/Services/Tax/FiscalStampCalculator.php:13-26`
```php
$stamp = max(5, min($amount * 0.01, 2500));
return round($stamp, 2);
```
- **Threshold:** None (applies to ALL amounts > 0)
- **Rounding:** `round(stamp, 2)`
- **Min stamp:** 5.0
- **Max stamp:** 2500.0
- **Rate:** 1%

### `ComputeLineService::computeDocument()` — Preview Calculator
**File:** `app/Services/ComputeLineService.php:374-375`
```php
if ($applyStamp && $totalTtc >= 30_000) {
    $stampAmount = min((int) ceil($totalTtc * 0.01), 2_500);
}
```
- **Threshold:** 30,000 DZD (stamp = 0 below this)
- **Rounding:** `(int) ceil()` — rounds UP to integer, then casts to int
- **Min stamp:** 0 (when below 30,000)
- **Max stamp:** 2500
- **Rate:** 1%

### Discrepancy

| TTC | `FiscalStampCalculator` | `ComputeLineService` | Difference |
|-----|------------------------|---------------------|------------|
| 100 | **5** (min applies) | **0** (below 30K) | 5 |
| 5000 | **50** | **0** (below 30K) | 50 |
| 29999 | **300** | **0** (below 30K) | 300 |
| 30000 | **300** | **300** | 0 |
| 30500 | **305** | **306** (ceil) | 1 |
| 50274.44 | **502.74** | **503** (ceil) | 0.26 |
| 100 | 5 | 0 | 5 |

### Who Calls What

| Caller | Calculator | Used When |
|--------|-----------|-----------|
| `CommercialDocumentObserver::saving()` | `FiscalStampCalculator` | Every `save()` / `update()` |
| `CommercialDocumentService::recalculateTotals()` | `FiscalStampCalculator` | Line add/edit/delete |
| `CommercialDocumentLineService::recalculateDocumentTotals()` | `FiscalStampCalculator` | Line changes |
| `DocumentComputeController::computeTotals()` | `ComputeLineService` | Frontend "compute totals" API call |

**Impact:** The frontend "compute totals" preview (via API) shows a **different stamp** than what gets saved to the database. For invoices < 30,000 DZD, preview shows 0 but database stores the actual stamp.

---

## Error #3 (HIGH): Frontend Document Form ≠ POS

### `pos/utils/calculations.ts:27-31` — POS Calculator
```typescript
const calculated = totalTtc * 0.01;
return Math.round(Math.max(5, Math.min(calculated, 2500)) * 100) / 100;
```
- **Threshold:** None (applies to ALL amounts > 0)
- **Rounding:** `Math.round(x * 100) / 100` (2 decimal places)
- **Min stamp:** 5
- **Max stamp:** 2500

### `document.utils.ts:78-81` — Document Form Calculator
```typescript
if (ttc < 30_000) return 0;
return Math.min(Math.ceil(ttc * 0.01), 2_500);
```
- **Threshold:** 30,000 DZD (stamp = 0 below this)
- **Rounding:** `Math.ceil()` (rounds UP to nearest integer)
- **Min stamp:** 0 (when below 30,000)
- **Max stamp:** 2500

### Discrepancy

| TTC | POS (`calculations.ts`) | Doc Form (`document.utils.ts`) | Difference |
|-----|------------------------|-------------------------------|------------|
| 100 | **5** | **0** | 5 |
| 5000 | **50** | **0** | 50 |
| 29999 | **300** | **0** | 300 |
| 30000 | **300** | **300** | 0 |
| 50274.44 | **502.74** | **503** (ceil) | 0.26 |

**Impact:** POS correctly matches the canonical backend calculator. Document form uses the WRONG formula (matches the wrong `ComputeLineService` preview instead of the canonical `FiscalStampCalculator`).

---

## Error #4 (HIGH): QuickSaleModal 4th Duplicate

**File:** `resources/js/pages/documents/QuickSaleModal.tsx:512`
```typescript
const stamp = ttc >= 30_000 ? Math.min(Math.ceil(ttc * 0.01), 2_500) : 0;
```
- Same 30,000 threshold + `ceil` as `document.utils.ts`
- Inline hardcoded — no shared function
- **4th independent implementation** of the same calculation

---

## Error #5 (MEDIUM): Excel Export Missing MIN_STAMP

**File:** `resources/js/components/ui/DataTable/excelExportAdvanced.ts:85-87`
```typescript
export function calcFiscalStamp(ttcAmount: number): number {
  if (ttcAmount <= 0) return 0;
  return Math.min(Math.round(ttcAmount * 0.01 * 100) / 100, 2500);
}
```
- **Threshold:** None ✓
- **Rounding:** `Math.round(x * 100) / 100` ✓
- **Min stamp:** MISSING — returns 2 for TTC=200 instead of 5
- **Max stamp:** 2500 ✓

| TTC | POS/Backend | Excel Export | Error |
|-----|-------------|-------------|-------|
| 100 | **5** | **1** | 4 |
| 200 | **5** | **2** | 3 |
| 499 | **5** | **4.99** | 0.01 |
| 500 | **5** | **5** | 0 |

---

## Error #6 (MEDIUM): FiscalStampService Dead Code

**File:** `app/Services/FiscalStampService.php:44-53`
```php
$document->stamp_amount = $stampData['amount'];  // ← NOT in $fillable, NOT a DB column
$document->fiscal_stamp_id = $stampData['stamp_id'];
$document->net_to_pay = $document->total_ttc + $document->stamp_amount - $document->paid_amount;
```

1. `stamp_amount` is **not** in `CommercialDocument::$fillable` — Eloquent silently ignores it
2. `stamp_amount` is **not** in the `commercial_documents` table schema
3. Only `FiscalStampController` injects this service, and it's used for CRUD on the `fiscal_stamps` lookup table — the `applyStampToDocument()` method is never called in any controller/service flow
4. The `net_to_pay` calculation here also includes `- paid_amount`, which is wrong (net_to_pay should be TTC + stamp; remaining_amount = net_to_pay - paid)

---

## Error #7 (LOW): Rounding Inconsistency Across Backend Services

| Service | Rounding | Precision |
|---------|----------|-----------|
| `FiscalStampCalculator::calculate()` | `round($stamp, 2)` | 2 decimals |
| `CommercialDocumentService::recalculateTotals()` | `round($totalStamp, 2)` | **2 decimals** |
| `CommercialDocumentLineService::recalculateDocumentTotals()` | `round($totalStamp, 4)` | **4 decimals** |
| `CommercialDocumentObserver::calculateDocumentTotals()` | `round($totalStamp, 4)` | **4 decimals** |
| DB model cast | `decimal:4` | 4 decimals |
| `ComputeLineService::computeDocument()` | `(int) ceil()` | **0 decimals** (integer) |

**Impact:** When adding lines (via `LineService` → Observer), stamp is stored as 4-decimal. When `recalculateTotals()` runs in `CommercialDocumentService`, stamp is re-stored as 2-decimal. The difference is sub-cent (e.g., `5.0000` vs `5.00`), but the `(int) ceil()` path in `ComputeLineService` can differ by up to 0.99.

---

## Error #8 (LOW): Two Completely Different Stamp Systems

| System | Source | Logic | Active? |
|--------|--------|-------|---------|
| `FiscalStampCalculator` | Hardcoded constants | 1% of TTC, min 5, max 2500 | **Yes** — used by Observer, DocumentService, LineService |
| `FiscalStampService` | `fiscal_stamps` DB table | Tiered rules (fixed/percentage per bracket), date-range validity | **Dead** — only CRUD controller, `applyStampToDocument()` never called |

The `fiscal_stamps` table has seeded data (100 DA for 0-1000, 300 DA for 1000-5000, 1000 DA for 5000+) but **no code path** applies these rules. The calculator ignores the table entirely.

---

## Complete Implementation Matrix

| # | File | Threshold | Min | Max | Rounding | Rate |
|---|------|-----------|-----|-----|----------|------|
| 1 | `FiscalStampCalculator.php` (backend canonical) | **None** | 5 | 2500 | `round(x,2)` | 1% |
| 2 | `ComputeLineService.php` (backend preview) | **30,000** | 0 | 2500 | `(int) ceil()` | 1% |
| 3 | `FiscalStampService.php` (backend dead code) | **Table-based** | Varies | Varies | `round(x,4)` | Table |
| 4 | `CommercialDocumentObserver.php` | Uses #1 | — | — | — | — |
| 5 | `CommercialDocumentService.php` | Uses #1 | — | — | — | — |
| 6 | `CommercialDocumentLineService.php` | Uses #1 | — | — | — | — |
| 7 | `pos/utils/calculations.ts` (POS) | **None** | 5 | 2500 | `round(x*100)/100` | 1% |
| 8 | `document.utils.ts` (doc form) | **30,000** | 0 | 2500 | `ceil()` | 1% |
| 9 | `QuickSaleModal.tsx` (quick sale) | **30,000** | 0 | 2500 | `ceil()` | 1% |
| 10 | `excelExportAdvanced.ts` (Excel export) | **None** | **0** ❌ | 2500 | `round(x*100)/100` | 1% |

### Canonical Formula (from `FiscalStampCalculator`)
```
stamp = max(5, min(TTC × 0.01, 2500))
```
- No threshold — applies to ALL amounts > 0
- Min stamp = 5 DZD
- Max stamp = 2500 DZD
- Rounded to 2 decimal places

---

## Recommended Fixes

1. **CRITICAL — Fix `attachBalanceData()`**: Only subtract `net_to_pay` when `affects_accounting = true`
2. **HIGH — Unify to canonical formula**: Replace `ComputeLineService`, `document.utils.ts`, `QuickSaleModal.tsx` with the canonical `max(5, min(TTC * 0.01, 2500))` formula
3. **MEDIUM — Add `MIN_STAMP = 5`** to `excelExportAdvanced.ts`
4. **MEDIUM — Delete or mark `FiscalStampService`** as deprecated (dead code writing to non-existent column)
5. **LOW — Unify rounding**: All services should use `round(x, 4)` to match DB cast `decimal:4`


