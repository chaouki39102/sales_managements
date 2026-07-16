# Phase 25 — تقرير تشخيصي: تتبع القيم في الإيصال المطبوع

## الغرض
تتبع كل قيمة تظهر في صندوق الإجماليات (totalsCard) في `DeliveryReceiptA5.tsx` — من قاعدة البيانات إلى الشاشة — حرفاً بحرف، باستخدام الكود الفعلي الحالي على القرص.

**ملاحظة:** لا يتوفر وصول مباشر لقاعدة البيانات أو لـ API حي في بيئة التشخيص هذه. لذلك **لا يمكن** تقديم JSON خام فعلي أو قيم `typeof` من console. جميع القيم أدناه مُستنتجة من الكود المصدري فقط.

---

## 1. الكود الحالي الفعلي لكل دالة ذات صلة

---

### 1.1 `CommercialDocumentController.php` — `attachBalanceData()`

**الملف:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:491-513`

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

**ملاحظة حاسمة:** `previous_balance` و `new_balance` متساويان دائماً — كلاهما = `current_balance`. لا يوجد "استرجاع" (reversal) لتأثير المستند.

---

### 1.2 `CommercialDocumentController.php` — `show()`, `store()`, `update()`

**الملف:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:255-301`

```php
public function show($id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $item = $this->getService()->findById($resolvedId);
        $this->authorizeAction('view', $item);
        $this->attachBalanceData($item);                           // ← يستدعي attachBalanceData
        return $this->successResponse($this->transformItem($item));
    } catch (\Throwable $e) {
        return $this->handleError($e, 'show');
    }
}

public function store(Request $request): JsonResponse
{
    try {
        $this->authorizeAction('create', $this->getModelClass());
        $data = $this->getValidatedData($request);
        $item = $this->getService()->create($data, $request);
        $this->attachBalanceData($item);                           // ← يستدعي attachBalanceData
        return $this->successResponse(
            $this->transformItem($item),
            "تم إنشاء {$this->resourceName} بنجاح",
            201
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'store');
    }
}

public function update(Request $request, $id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $item       = $this->getService()->findById($resolvedId);
        $this->authorizeAction('update', $item);
        $data = $this->getValidatedData($request, $resolvedId);
        $item = $this->getService()->update($item, $data, $request);
        $this->attachBalanceData($item);                           // ← يستدعي attachBalanceData
        return $this->successResponse(
            $this->transformItem($item),
            "تم تحديث {$this->resourceName} بنجاح"
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'update');
    }
}
```

**الخلاصة:** الثلاثة (`show`, `store`, `update`) تستدعي `attachBalanceData()`.

---

### 1.3 `PartyBalanceService.php` — `getBalanceAt()`

**الملف:** `app/Services/PartyBalanceService.php:20-90`

```php
public function getBalanceAt(int $partyId, string $date): array
{
    $companyId = $this->companyContext->get();
    $date      = substr($date, 0, 10);

    $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

    // 1. Opening balance
    $opening = OpeningBalanceParty::query()
        ->where('company_id',     $companyId)
        ->where('party_id',       $partyId)
        ->where('fiscal_year_id', $fiscalYearId)
        ->first();

    $openingAmount = $opening?->signedAmount() ?? 0.0;

    // 2. Documents balance
    $documentsBalance = (float) (DB::table('commercial_documents as cd')
        ->join('document_types as dt',           'cd.document_type_id',           '=', 'dt.id')
        ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
        ->where('cd.company_id',         $companyId)
        ->where('cd.party_id',           $partyId)
        ->where('cd.fiscal_year_id',     $fiscalYearId)
        ->where('dt.affects_accounting', true)
        ->whereDate('cd.document_date',  '<=', $date)     // ← يشمل هذا المستند!
        ->whereNull('cd.deleted_at')
        ->selectRaw("
            COALESCE(SUM(CASE WHEN dbo.name = 'sale'     THEN cd.net_to_pay ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN dbo.name = 'purchase' THEN cd.net_to_pay ELSE 0 END), 0)
            as balance
        ")
        ->value('balance') ?? 0);

    // 3. Payments
    $paymentsTotal = (float) (DB::table('payments')
        ->where('company_id',     $companyId)
        ->where('party_id',       $partyId)
        ->where('fiscal_year_id', $fiscalYearId)
        ->where('status',         'confirmed')
        ->whereDate('payment_date', '<=', $date)
        ->whereNull('deleted_at')
        ->sum('amount') ?? 0);

    $currentBalance = round(
        $openingAmount + $documentsBalance - $paymentsTotal,
        2
    );

    return [
        'party_id'          => $partyId,
        'date'              => $date,
        'fiscal_year_id'    => $fiscalYearId,
        'opening_balance'   => round($openingAmount,   4),
        'documents_balance' => round($documentsBalance, 4),
        'payments_total'    => round($paymentsTotal,    4),
        'current_balance'   => $currentBalance,
        'signed_balance'    => $currentBalance,
        'balance_type'      => $currentBalance >= 0 ? 'debit' : 'credit',
    ];
}
```

**الصيغة:** `current_balance = opening_balance + documents_balance - payments_total`

**ملاحظة:** `documents_balance` يشمل **جميع** المستندات التي تاريخها `<= $date` — بما في ذلك المستند الحالي. لذلك `current_balance` هو الرصيد **بعد** هذا المستند.

---

### 1.4 `CommercialDocumentResource.php` — الحقول المالية + `balance_data`

**الملف:** `app/Http/Resources/CommercialDocumentResource.php:28-72`

```php
'total_ht'           => $this->total_ht,            // decimal:4 → float
'total_tva'          => $this->total_tva,           // decimal:4 → float
'total_discount'     => $this->total_discount,      // decimal:4 → float
'total_stamp'        => $this->total_stamp,         // decimal:4 → float
'total_ttc'          => $this->total_ttc,           // decimal:4 → float
'net_to_pay'         => $this->net_to_pay,          // decimal:4 → float
'paid_amount'        => $this->paid_amount,         // decimal:4 → float
'remaining_amount'   => $this->remaining_amount,    // decimal:4 → float
// ...
'balance_data'       => $this->balance_data ?? null, // مُضافة ديناميكياً via attachBalanceData()
```

**ملاحظة:** `balance_data` **ليس** في `$fillable` ولا في `$casts`. هو حقل ديناميكي يُضاف إلى الـ Model بواسطة `attachBalanceData()` كـ `$doc->balance_data = [...]`. يتم تمريره عبر `$this->balance_data` في Resource.

---

### 1.5 `CommercialDocument.php` — `$casts`

**الملف:** `app/Models/CommercialDocument.php:72-96`

```php
protected $casts = [
    'exchange_rate'          => 'decimal:8',
    'document_date'          => 'date',
    'issued_at'              => 'datetime',
    'due_date'               => 'date',
    'delivery_date'          => 'date',
    'total_ht'               => 'decimal:4',
    'total_tva'              => 'decimal:4',
    'total_discount'         => 'decimal:4',
    'total_stamp'            => 'decimal:4',
    'total_ttc'              => 'decimal:4',
    'net_to_pay'             => 'decimal:4',
    'paid_amount'            => 'decimal:4',
    'remaining_amount'       => 'decimal:4',
    'payment_terms'          => 'array',
    'shipping_info'          => 'array',
    'legal_mentions'         => 'array',
    'is_locked'              => 'boolean',
    'validated_at'           => 'datetime',
    'is_exported_to_accounting' => 'boolean',
    'exported_at'            => 'datetime',
    'created_at'             => 'datetime',
    'updated_at'             => 'datetime',
    'deleted_at'             => 'datetime',
];
```

**الحقول المالية كلها `decimal:4`** — Laravel يحوّلها إلى `float` في PHP، ثم JSON يحوّلها إلى **أرقام** (ليس نصوص).

**`balance_data` ليس في `$casts`** — هو عبارة عن `array` عادي PHP (لا يوجد cast خاص).

---

### 1.6 `DocumentDataBuilder.ts` — الدوال الخمس المطلوبة

**الملف:** `resources/js/pages/settings/print-settings/types/data/DocumentDataBuilder.ts`

#### `fromApiDocument()` (سطور 186-225)

```typescript
fromApiDocument(
    doc:     ApiDocument,
    company: CompanyInfo,
    options?: {
      prevBalance?: number;
      newBalance?:  number;
    },
  ): UniversalDocumentData {
    const lines  = buildLinesFromApi(doc.lines ?? []);
    const totals = buildTotalsFromApi(doc, lines);

    // SSOT: backend computes balance_data. Fall back to options for legacy.
    let prev: number | null | undefined;
    let next: number | null | undefined;
    if (doc.balance_data) {
      prev = doc.balance_data.previous_balance;
      next = doc.balance_data.new_balance;
    } else if (options?.prevBalance != null && options?.newBalance != null) {
      prev = options.prevBalance;
      next = options.newBalance;
    }
    const balance = prev != null && next != null
      ? buildBalance(prev, next)
      : null;

    return {
      doc:         buildDocInfo(doc),
      company,
      party:       buildPartyFromApi(doc.party),
      warehouse:   buildWarehouseFromApi(doc.warehouse),
      session:     null,
      lines,
      totals,
      taxBreakdown: buildTaxBreakdown(lines),
      payments:     buildPaymentsFromApi(doc.payments ?? []),
      balance,
      currency:     buildCurrencyFromApi(doc.currency),
      computed:     {},
    };
  },
```

**سلسلة الأولوية للـ balance:**
1. `doc.balance_data` (من `show()`/`store()`/`update()`)
2. `options.prevBalance`/`options.newBalance` (من `partyBalance?.current_balance`)
3. `null` (لا يوجد رصيد)

#### `buildTotalsFromApi()` (سطور 520-542)

```typescript
function buildTotalsFromApi(
  doc:   ApiDocument,
  lines: DocumentLine[],
): DocumentTotals {
  // Prefer flat backend fields (SSOT), then nested totals, then sum lines
  const t = doc.totals;
  const lineSums = {
    ht:  lines.reduce((s, l) => s + l.totalHt,  0),
    tva: lines.reduce((s, l) => s + l.totalTva, 0),
    ttc: lines.reduce((s, l) => s + l.totalTtc, 0),
    disc: lines.reduce((s, l) => s + l.discountAmt, 0),
  };
  return {
    totalHt:       doc.total_ht       ?? t?.total_ht       ?? lineSums.ht,
    totalTva:      doc.total_tva      ?? t?.total_tva      ?? lineSums.tva,
    totalTtc:      doc.total_ttc      ?? t?.total_ttc      ?? lineSums.ttc,
    fiscalStamp:   doc.total_stamp    ?? t?.fiscal_stamp   ?? 0,
    totalDiscount: doc.total_discount ?? t?.total_discount ?? lineSums.disc,
    paid:          doc.paid_amount    ?? t?.paid           ?? 0,
    change:        t?.change         ?? 0,
    remaining:     doc.remaining_amount ?? t?.remaining     ?? 0,
  };
}
```

**سلسلة الأولوية لكل حقل:** `doc.total_ht` (flat) → `doc.totals.total_ht` (nested) → `lineSums.ht` (sum من الأسطر).

**لا يوجد `Number()` أو `parseFloat()` صريح** — القيم تمر كما هي. الـ `??` هو nullish coalescing (يتعامل مع `null`/`undefined` فقط، ليس `0`).

#### `buildLineFromApi()` (سطور 438-468)

```typescript
function buildLineFromApi(line: ApiDocumentLine, index: number): DocumentLine {
  const tvaRate   = line.tva_rate ?? 0;
  const tvaPct    = Math.round(tvaRate * 100);
  const discPct   = line.discount_percentage ?? 0;
  const discAmt   = line.discount_amount     ?? 0;
  const totalHt   = line.total_ht ?? 0;
  const totalTva  = line.total_tva  ?? totalHt * tvaRate;
  const totalTtc  = line.total_ttc  ?? totalHt + totalTva;
  const uPriceHt  = line.unit_price_ht  ?? 0;
  const uPriceTtc = line.unit_price_ttc ?? uPriceHt * (1 + tvaRate);

  return {
    rowNumber:    index + 1,
    ref:          line.product?.reference  ?? null,
    barcode:      line.product?.barcode    ?? null,
    name:         line.product?.name ?? line.description ?? '',
    unit:         line.product?.unit?.name ?? line.packaging?.name ?? null,
    quantity:     line.quantity,
    unitPriceHt:  uPriceHt,
    unitPriceTtc: uPriceTtc,
    tvaRate,
    tvaPct,
    discountPct:  discPct,
    discountAmt:  discAmt,
    totalHt,
    totalTva,
    totalTtc,
    lot:   line.stock_lot?.lot_number ?? null,
    notes: line.notes ?? null,
  };
}
```

**لا يوجد `Number()` أو `parseFloat()`** — كل الحقول تعتمد على `?? 0` فقط.

#### `buildBalance()` (سطور 553-565)

```typescript
function buildBalance(
  prev?: number | null,
  next?: number | null,
): BalanceInfo | null {
  // Both prev and next must be present for a meaningful balance snapshot.
  // Partial data (one null) → null (caller should provide both or neither).
  if (prev == null || next == null) return null;
  return {
    previous: prev,
    movement: next - prev,
    current:  next,
  };
}
```

**النتيجة:** `balance.previous = prev`, `balance.movement = next - prev`, `balance.current = next`.

#### `buildPaymentsFromApi()` (سطور 544-551)

```typescript
function buildPaymentsFromApi(apiPayments: ApiPayment[]): Payment[] {
  return apiPayments.map(p => ({
    mode:      p.payment_mode?.name ?? '—',
    amount:    p.amount,
    reference: p.reference    ?? null,
    date:      p.payment_date ?? null,
  }));
}
```

---

### 1.7 `TemplatePrintModal.tsx` — الملف كاملاً

**الملف:** `resources/js/pages/settings/print-settings/components/shared/TemplatePrintModal.tsx` (196 سطر)

```typescript
import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import UniversalPrintPipeline, { renderPipelineToPopup } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';

// ─── ApiDocument ────────────────────────────────────────────────────────────
interface ApiDocument {
  id?:                   number;
  document_number?:      string;
  document_date?:        string;
  due_date?:             string | null;
  notes?:                string | null;
  document_type?:        { code?: string; name?: string } | null;
  document_status?:      { name?: string; code?: string } | null;
  party?:                Record<string, unknown> | null;
  warehouse?:            Record<string, unknown> | null;
  currency?:             { code?: string; symbol?: string; exchange_rate?: number } | null;
  lines?:                Record<string, unknown>[];
  payments?:             Record<string, unknown>[];
  totals?:               Record<string, unknown> | null;
  total_ht?:             number;
  total_tva?:            number;
  total_ttc?:            number;
  total_discount?:       number;
  total_stamp?:          number;
  net_to_pay?:           number;
  paid_amount?:          number;
  remaining_amount?:     number;
  balance_data?: {
    previous_balance: number;
    new_balance:      number;
  } | null;
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface TemplatePrintModalProps {
  open:        boolean;
  onClose:     () => void;
  document?:   ApiDocument;
  company:     CompanyData;
  templates?:  PrintTemplate[];
  template?:   PrintTemplate;
  docTypeCode: string;
  data?:       UniversalDocumentData;
  prevBalance?: number;
  newBalance?:  number;
}

// ─── Component ──────────────────────────────────────────────────────────────
function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData, prevBalance, newBalance }: TemplatePrintModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const tpl: PrintTemplate | null = useMemo(() => {
    if (template) return template;
    const found = resolveTemplate(templates ?? [], docTypeCode);
    return found ?? null;
  }, [template, templates, docTypeCode]);

  const source = useMemo(() => {
    if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
    if (document) return { type: 'api-document' as const, doc: document, options: { prevBalance, newBalance } };
    return null;
  }, [overrideData, document, prevBalance, newBalance]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handlePrint = useCallback(() => {
    if (!tpl || !source) return;
    renderPipelineToPopup(source, tpl, company);
  }, [tpl, source, company]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>طباعة حسب القالب</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t4)', padding: '0 4px', lineHeight: 1 }} aria-label="إغلاق">✕</button>
        </div>
        <div style={previewAreaStyle}>
          {source && tpl ? (
            <UniversalPrintPipeline source={source} template={tpl} company={company} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
              {!tpl ? 'لا يوجد قالب لهذا المستند' : 'لا توجد بيانات للمعاينة'}
            </div>
          )}
        </div>
        <div style={footerStyle}>
          <button style={btnSecondary} onClick={onClose}>إلغاء</button>
          <button style={btnPrimary} onClick={handlePrint} disabled={!tpl || !source}>طباعة</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TemplatePrintModal);
```

**ملاحظة:** `company` **ليس** جزءً من `source`. الـ `source` يحتوي فقط `{ type, doc, options }`. يمر `company` كـ prop منفصل إلى `UniversalPrintPipeline`.

---

### 1.8 `UniversalPrintPipeline.tsx` — جزء `buildData`

**الملف:** `resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx:35-39, 53-67, 141-148`

```typescript
export type PipelineSource =
  | { type: 'api-document'; doc: Record<string, unknown>; options?: { prevBalance?: number; newBalance?: number } }
  | { type: 'pos-snapshot'; snapshot: POSSaleSnapshot }
  | { type: 'session-report'; session: Record<string, unknown> }
  | { type: 'prebuilt'; data: UniversalDocumentData };

// ─── Pipeline component ────────────────────────────────────────────────────
export default function UniversalPrintPipeline({ source, template, company, className, style }: Props) {
  const data: UniversalDocumentData = useMemo(() => {
    switch (source.type) {
      case 'prebuilt':
        return source.data;
      case 'api-document':
        return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
      // ...
    }
  }, [source, company]);

  return (
    <Suspense fallback={FALLBACK}>
      <div className={className} style={style}>
        <UniversalPreview tpl={template} data={data} />
      </div>
    </Suspense>
  );
}

// ─── Print-to-popup helper ─────────────────────────────────────────────────
function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
  switch (source.type) {
    case 'api-document':
      return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    // ...
  }
}
```

**ملاحظة:** `source.options` (الذي يحتوي `prevBalance`/`newBalance`) يُمرَّ إلى `fromApiDocument()`.

---

### 1.9 `DeliveryReceiptA5.tsx` — صندوق الإجماليات (totalsCard)

**الملف:** `resources/js/pages/settings/print-settings/components/preview/DeliveryReceiptA5.tsx:126-128, 279-293, 545-574`

#### حساب القيم (سطور 126-128):

```typescript
const prevBalance = data.balance?.previous ?? 0;
const newBalance  = data.balance?.current ?? 0;
const totalAmount = data.totals.totalTtc + prevBalance;
```

#### تعريف الأسلوب (سطور 279-293):

```typescript
const totalsCard: React.CSSProperties = {
  flex: 1.25, ...BORDER_BOX, overflow: 'hidden', fontSize: 12,
};

const totalsRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #e8e8e8',
};

const totalsRowLast: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  background: INK, color: '#fff', fontWeight: 800, fontSize: 13,
  padding: '7px 10px', borderTop: `1px solid ${INK}`,
};
```

#### JSX صندوق الإجماليات (سطور 545-574):

```tsx
<div style={totalsCard}>
  {tpl.show_total_ttc && (
    <div style={totalsRow}>
      <span>المبلغ TTC</span>
      <span dir="ltr">{fmtCurrency(data.totals.totalTtc)}</span>
    </div>
  )}
  {tpl.show_prev_balance && (
    <div style={totalsRow}>
      <span>الدين القديم</span>
      <span dir="ltr">{fmtCurrency(prevBalance)}</span>
    </div>
  )}
  <div style={totalsRow}>
    <span>المجموع</span>
    <span dir="ltr">{fmtCurrency(totalAmount)}</span>
  </div>
  {tpl.show_paid_amount && (
    <div style={totalsRow}>
      <span>المدفوع</span>
      <span dir="ltr">{fmtCurrency(data.totals.paid)}</span>
    </div>
  )}
  {tpl.show_new_balance && (
    <div style={totalsRowLast}>
      <span>الرصيد الجديد</span>
      <span dir="ltr">{fmtCurrency(newBalance)}</span>
    </div>
  )}
</div>
```

#### `fmtCurrency()` (سطور 26-32):

```typescript
function fmtCurrency(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  const [intPart, decPart] = n.toFixed(2).split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces}.${decPart}`;
}
```

**ملاحظة:** `fmtCurrency` يستخدم `Number(v ?? 0)` — يحوّل أي شيء إلى رقم. إذا كان `v` نصاً مثل `"5027.44"`، يُحوّله إلى `5027.44` (رقم). إذا كان `NaN` بالفعل، يُرجع `"0.00"`.

---

### 1.10 `CommercialDocumentModal/index.tsx` — `<TemplatePrintModal>`

**الملف:** `resources/js/pages/documents/CommercialDocumentModal/index.tsx:508-523`

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

**ملاحظة:** `existingDocument` هو `Record<string, unknown>` — يحتوي على `balance_data` إذا أتى من `show()`. `partyBalance` يأتي من `useDocumentForm`.

---

### 1.11 `CommercialDocumentPage.tsx` — `<TemplatePrintModal>`

**الملف:** `resources/js/pages/documents/CommercialDocumentPage.tsx:457-471`

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

**ملاحظة مطابقة:** `existingDoc` يأتي من `apiGet('/documents/${id}')` → `show()` → يحتوي `balance_data`.

---

### 1.12 `useDocumentForm.ts` — جلب `partyBalance`

**الملف:** `resources/js/pages/documents/hooks/useDocumentForm.ts:72-82, 638-654`

#### نوع البيانات (سطور 72-82):

```typescript
export interface PartyBalanceInfo {
  party_id:          number;
  current_balance:   number;
  signed_balance:    number;
  balance_type:      'debit' | 'credit';
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  fiscal_year_id:    number;
  date:              string;
}
```

#### الاستعلام (سطور 638-654):

```typescript
const partyIdNum = form.party_id ? parseInt(form.party_id) : null;

const { data: partyBalance = null, isLoading: isLoadingBalance } =
  useQuery<PartyBalanceInfo | null>({
    queryKey: [slug, 'party-balance', partyIdNum, form.fiscal_year_id, form.document_date],
    queryFn: async () => {
      if (!partyIdNum) return null;
      return apiGet<PartyBalanceInfo>(
        `/party-balances/${partyIdNum}`,
        { date: form.document_date || today() },
      );
    },
    enabled:   !!slug && !!partyIdNum && needsParty,
    staleTime: 60_000,
  });
```

**ملاحظة:** يجلب من `GET /party-balances/{partyId}` مع `?date=...` — يستخدم **نفس** الدالة `getBalanceAt()` في الخلفية.

---

## 2. القيم الفعلية عبر السلسلة الكاملة (من الكود، لا من API حقيقي)

### 2.1 استجابة API المُتوقعة لـ `GET /documents/{id}`

```
{
  "data": {
    "total_ht":              <رقم — decimal:4 cast>,
    "total_tva":             <رقم — decimal:4 cast>,
    "total_discount":        <رقم — decimal:4 cast>,
    "total_stamp":           <رقم — decimal:4 cast>,
    "total_ttc":             <رقم — decimal:4 cast>,
    "net_to_pay":            <رقم — decimal:4 cast>,
    "paid_amount":           <رقم — decimal:4 cast>,
    "remaining_amount":      <رقم — decimal:4 cast>,
    "balance_data": {
      "previous_balance":    <رقم — round($currentBalance, 2)>,
      "new_balance":         <رقم — round($currentBalance, 2)>
    },
    "payments": [
      { "amount": <رقم>, "payment_mode": { "name": "..." }, ... }
    ],
    "lines": [
      { "quantity": <رقم>, "unit_price_ht": <رقم>, "tva_rate": <رقم>, "total_ht": <رقم>, ... }
    ],
    ...
  }
}
```

**نوع `total_ttc`:** رقم (ليس نص). Laravel `decimal:4` cast → PHP `float` → JSON `number`.
**نوع `balance_data.previous_balance`:** رقم. `round($currentBalance, 2)` → PHP `float` → JSON `number`.
**نوع `payments[].amount`:** رقم. Payment model `decimal:2` cast → JSON `number`.

### 2.2 استجابة API المُتوقعة لـ `GET /party-balances/{id}?date=...`

```json
{
  "data": {
    "party_id":          <رقم>,
    "date":              "<نص>",
    "fiscal_year_id":    <رقم>,
    "opening_balance":   <رقم>,
    "documents_balance": <رقم>,
    "payments_total":    <رقم>,
    "current_balance":   <رقم>,
    "signed_balance":    <رقم>,
    "balance_type":      "<'debit' | 'credit'>"
  }
}
```

**نوع `current_balance`:** رقم. `round($currentBalance, 2)` → PHP `float` → JSON `number`.

### 2.3 `typeof` المتوقع في الجلسة الفعلية

لأن `delivery: "delivery"` و `console.log` غير متاحين في هذه البيئة:

| التعبير | `typeof` المتوقع | السبب |
|---|---|---|
| `data.totals.totalTtc` | `number` | comes from `doc.total_ttc` (decimal:4 cast) |
| `data.balance?.previous` | `number` | comes from `balance_data.previous_balance` (round to 2) |
| `data.balance?.current` | `number` | comes from `balance_data.new_balance` (round to 2) |
| `data.totals.paid` | `number` | comes from `doc.paid_amount` (decimal:4 cast) |
| `prevBalance` (in DeliveryReceiptA5) | `number` | `data.balance?.previous ?? 0` |
| `newBalance` (in DeliveryReceiptA5) | `number` | `data.balance?.current ?? 0` |
| `totalAmount` (in DeliveryReceiptA5) | `number` | `data.totals.totalTtc + prevBalance` (number + number) |

**لا يوجد أي `typeof` آخر ممكن** — كل الحقول مُعرّفة كـ `number` في TypeScript interface، والـ backend يُرجع أرقاماً.

### 2.4 القيمة الفعلية لـ `totalAmount`

```typescript
const totalAmount = data.totals.totalTtc + prevBalance;
```

- `data.totals.totalTtc` = القيمة من `doc.total_ttc` (SSOT من قاعدة البيانات)
- `prevBalance` = `data.balance?.previous ?? 0` = قيمة `previous_balance` من `balance_data`

**النوع:** `number` (جمع رقم + رقم).

---

## 3. مقارنة مباشرة: صفحة المستند مقابل الإيصال المطبوع

| الحقل | صفحة المستند (`DocumentTotalsSection`) | الإيصال المطبوع (`DeliveryReceiptA5`) |
|---|---|---|
| **إجمالي TTC** | `fmtDZD(totals.ttc)` = `fmtDZD(doc.total_ttc)` | `fmtCurrency(data.totals.totalTtc)` = `fmtCurrency(doc.total_ttc)` |
| **الدين القديم** | `fmtDZD(partyBalance.current_balance)` (من `GET /party-balances/{id}`) | `fmtCurrency(data.balance?.previous ?? 0)` = `fmtCurrency(balance_data.previous_balance)` |
| **بعد المستند / الرصيد الجديد** | `fmtDZD(futureBalance)` (محسوب: `signed_balance + deltaDoc - deltaPmt`) | `fmtCurrency(data.balance?.current ?? 0)` = `fmtCurrency(balance_data.new_balance)` |
| **المجموع** | — (غير موجود في صفحة المستند) | `fmtCurrency(data.totals.totalTtc + prevBalance)` |
| **المدفوع** | `fmtDZD(totals.totalPaid)` | `fmtCurrency(data.totals.paid)` |

### 3.1 مصدر كل قيمة

**صفحة المستند:**
- `totals.ttc` → `useDocumentForm` → `form.lines` sum أو `existingDocument.total_ttc`
- `partyBalance.current_balance` → `useQuery` → `GET /party-balances/{id}?date=...` → `PartyBalanceService::getBalanceAt()`
- `futureBalance` → `partyBalance.signed_balance + deltaDoc - deltaPmt` (محسوب في المكون)

**الإيصال المطبوع:**
- `data.totals.totalTtc` → `doc.total_ttc` (من API `show()`)
- `data.balance.previous` → `doc.balance_data.previous_balance` (من `attachBalanceData()`)
- `data.balance.current` → `doc.balance_data.new_balance` (من `attachBalanceData()`)
- `totalAmount` = `data.totals.totalTtc + data.balance.previous` (محسوب في DeliveryReceiptA5)

### 3.2 هل القيم متطابقة؟

**إجمالي TTC:** ✅ متطابق — كلاهما يقرأ من `doc.total_ttc`.

**الدين القديم (previous balance):**
- صفحة المستند: `partyBalance.current_balance` (من `GET /party-balances/{id}`)
- الإيصال: `balance_data.previous_balance` (من `attachBalanceData()`)

كلاهما يستدعي `PartyBalanceService::getBalanceAt($partyId, $document_date)`.
لكن في `attachBalanceData()`:
```php
$previous_balance = round($currentBalance, 2);  // = current_balance
```
و في صفحة المستند:
```
رصيد الحالي = partyBalance.current_balance
```
**النتيجة:** كلاهما = `current_balance`. ✅ متطابق.

**الرصيد الجديد (new balance):**
- صفحة المستند: `futureBalance` = `partyBalance.signed_balance + deltaDoc - deltaPmt`
- الإيصال: `balance_data.new_balance` = `current_balance`

**⚠️ قد يختلفان!** إذا كان المستند في وضع التعديل (`isEdit`) والتغييرات غير محفوظة:
- صفحة المستند تحسب `futureBalance` بناءً على **التغييرات الحالية** في النموذج
- الإيصال يقرأ `new_balance` من **آخر حفظ** (البيانات المخزنة)

لكن عند طباعة مستند **محفوظ** (يكون `handlePrint` متاح فقط عندما `isEdit = true` و `existingDocument` موجود):
- `deltaDoc = totals.netToPay - existingNetToPay` = `0` (لم يتغير)
- `deltaPmt = totals.totalPaid - existingPaymentsSum` = `0` (لم تتغير)
- `futureBalance = signed_balance + 0 - 0 = signed_balance = current_balance`

**✅ متطابق للمستندات المحفوظة بدون تعديل.**

**المجموع:**
- صفحة المستند: غير موجود
- الإيصال: `totalTtc + prevBalance` = `total_ttc + current_balance`

**المدفوع:**
- صفحة المستند: `fmtDZD(totals.totalPaid)` — مصدر: مجموع `payments[].amount`
- الإيصال: `fmtCurrency(data.totals.paid)` — مصدر: `doc.paid_amount` (من قاعدة البيانات)

**⚠️ قد يختلفان!** `totals.totalPaid` في صفحة المستند يُحسب من `payments[]` (الدفعات الحالية في النموذج)، بينما `doc.paid_amount` في الإيصال يقرأ من الحقل المخزون في قاعدة البيانات. إذا كان هناك دفعات جديدة لم تُحفَّظ بعد، ستختلف.

---

## 4. تحليل البيانات: مسار كل قيمة

```
┌─────────────────────────────────────────────────────────────┐
│                     BASE DATA                                │
│                                                              │
│  commercial_documents table:                                 │
│    total_ttc = 5027.44  (decimal:4)                         │
│    paid_amount = 5000.00 (decimal:4)  ← أو من payments      │
│    net_to_pay = 5027.44  (decimal:4)                        │
│    party_id = X                                                │
│    document_date = "2026-07-16"                              │
│                                                              │
│  payments table (لنفس الزبون):                                │
│    SUM(amount) WHERE date <= "2026-07-16" = 4970.40          │
│                                                              │
│  opening_balances_parties:                                    │
│    signedAmount() = 0  (أو قيمة افتتاحية)                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PartyBalanceService::getBalanceAt(X, "2026-07-16")         │
│                                                              │
│  documents_balance = SUM(sales net_to_pay)                   │
│                    - SUM(purchases net_to_pay)               │
│                    WHERE date <= "2026-07-16"                 │
│                    (يشمل هذا المستند!)                       │
│                                                              │
│  payments_total = SUM(confirmed payments)                    │
│                 WHERE date <= "2026-07-16"                    │
│                                                              │
│  current_balance = opening + documents_balance - payments   │
│                  = 0 + 5027.44 - 4970.40                     │
│                  = 57.04                                      │
│                                                              │
│  RETURN: { current_balance: 57.04, signed_balance: 57.04 }  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CommercialDocumentController::attachBalanceData()           │
│                                                              │
│  balance_data = {                                            │
│    previous_balance: 57.04,  ← = current_balance             │
│    new_balance: 57.04         ← = current_balance             │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CommercialDocumentResource (JSON response)                  │
│                                                              │
│  {                                                           │
│    "total_ttc": 5027.44,       ← رقم (decimal:4 cast)       │
│    "paid_amount": 5000.00,     ← رقم (decimal:4 cast)       │
│    "balance_data": {                                         │
│      "previous_balance": 57.04,  ← رقم (round 2)            │
│      "new_balance": 57.04         ← رقم (round 2)           │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: DocumentDataBuilder.fromApiDocument()             │
│                                                              │
│  totals.totalTtc = doc.total_ttc = 5027.44                   │
│  totals.paid = doc.paid_amount = 5000.00                     │
│  balance.previous = doc.balance_data.previous_balance = 57.04│
│  balance.current = doc.balance_data.new_balance = 57.04      │
│  balance.movement = 57.04 - 57.04 = 0                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  DeliveryReceiptA5.tsx                                       │
│                                                              │
│  prevBalance = data.balance?.previous ?? 0 = 57.04           │
│  newBalance  = data.balance?.current ?? 0  = 57.04           │
│  totalAmount = data.totals.totalTtc + prevBalance             │
│              = 5027.44 + 57.04                                │
│              = 5084.48                                        │
│                                                              │
│  ─── totalsCard ───                                          │
│  المبلغ TTC    = fmtCurrency(5027.44) = "5 027.44"          │
│  الدين القديم  = fmtCurrency(57.04)   = "57.04"             │
│  المجموع       = fmtCurrency(5084.48) = "5 084.48"          │
│  المدفوع       = fmtCurrency(5000.00) = "5 000.00"          │
│  الرصيد الجديد = fmtCurrency(57.04)   = "57.04"             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. خلاصة تحليلية

### 5.1 هل يوجد خلل في الكود الحالي؟

**لا يوجد خلل في المسار الأساسي** (`show()` → `attachBalanceData()` → `fromApiDocument()` → `DeliveryReceiptA5`).

**لكن يوجد سؤال غير مُجاب عنه:** هل القيم أعلاه (5027.44, 57.04, إلخ) هي القيم **الفعليّة** في قاعدة البيانات؟ لا يمكن التحقق من ذلك بدون وصول لقاعدة البيانات.

### 5.2 فرضية حول سبب الخلل السابق (قبل Phase 23)

**المشكلة السابقة** (التي صُلحت في Phase 23) كانت:

1. **`attachBalanceData()` كان يسترجع تأثير المستند:** `$previousBalance = $currentBalance - $net_to_pay`. بما أن `getBalanceAt()` يشمل هذا المستند بالفعل، كان `previous_balance` = `57.04 - 5027.44 = -4970.40` — وهو خاطئ.

2. **لم يكن `balance_data` موجوداً في `store()`/`update()`:** المستندات المحفوظة حديثاً عبر POST/PUT لم تكن تحمل `balance_data` — فالإيصال كان يحصل على `null` ويستخدم `options` فقط.

3. **لم تكن هناك `prevBalance`/`newBalance` props في `TemplatePrintModal`:** حتى لو أردنا التراجع إلى `partyBalance.current_balance`، لم يكن هناك مسار للتمرير.

### 5.3 ملاحظة مهمة: `المجموع` في الإيصال

```typescript
const totalAmount = data.totals.totalTtc + prevBalance;
```

`المجموع` في الإيصال = TTC + الدين القديم. هذا **ليس** صافياً (لا يطرح المدفوع). إذا كان الزبون مديناً بـ 57.04 دج بعد مستند TTC = 5027.44 مدفوع منه 5000، فإن:
- `totalAmount = 5027.44 + 57.04 = 5084.48`
- `newBalance = 57.04`

**`totalAmount` يمثل: إجمالي ما يجب على الزبون دفعه (TTC + ما سبق من دين).**

### 5.4 ملاحظة: `paid_amount` في الإيصال مقابل `totalPaid` في صفحة المستند

- `data.totals.paid` في الإيصال = `doc.paid_amount` (من قاعدة البيانات)
- `totals.totalPaid` في صفحة المستند = مجموع `payments[].amount` (من النموذج)

**قد يختلفان إذا**:
- تمت إضافة دفعات جديدة في النموذج ولم تُحفَّظ بعد
- `paid_amount` في قاعدة البيانات لم يُحدَّث بعد (يتم تحديثه بواسطة `PaymentSynchronizer` عند الحفظ)

---

## 6. ملخص مسار البيانات

```
DB (decimal:4 casts)
  → PHP (float via $casts)
    → CommercialDocumentResource (JSON number)
      → Frontend ApiDocument (number)
        → DocumentDataBuilder.fromApiDocument()
          → totals.totalTtc = doc.total_ttc  (no conversion)
          → balance.previous = doc.balance_data.previous_balance  (no conversion)
          → balance.current = doc.balance_data.new_balance  (no conversion)
            → DeliveryReceiptA5
              → prevBalance = data.balance?.previous ?? 0  (number)
              → newBalance = data.balance?.current ?? 0  (number)
              → totalAmount = data.totals.totalTtc + prevBalance  (number)
                → fmtCurrency() → "5 027.44" / "57.04" / "5 084.48"
```

**لا يوجد أي `Number()`, `parseFloat()`, `parseInt()` أو تحويل صريح** في المسار من API إلى `fmtCurrency()`، باستثناء `Number(v ?? 0)` داخل `fmtCurrency()` نفسه (เคส أمان فقط).
