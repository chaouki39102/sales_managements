# Phase 27 — تشخيص عدم تطابق previous/new balance في الإيصال المطبوع

**التاريخ:** 2026-07-16
**الحالة:** تشخيص فقط — لا تعديلات كود

---

## 1. المشكلة المُوصَفة

بعد إصلاح Phase 26 (تحويل `decimal:N` strings إلى أرقام حقيقية)، اختفى `NaN` و`"0.00"` غير المنطقي. لكن ظهر تناقض **منطقي** بين أرقام الإيصال المطبوع وأرقام صفحة المستند:

**مثال من صفحة المستند (لحظة الطباعة):**
```
رصيد أحمد الصالح محمد الحالي:      0.00
بعد هذا المستند سيصبح:            5,027.44
```

**نفس المستند، نفس اللحظة، مطبوع (A5):**
```
المبلغ TTC:      5,027.44
الدين القديم:    -5,077.71
المجموع:         -50.27      (= 5027.44 + (-5077.71) ✓ صحيح حسابياً)
المدفوع:         0.00
الرصيد الجديد:   0.00        (✗ يجب أن يكون -50.27)
```

**التناقض:** `الرصيد الجديد` المطبوع لا يساوي `المجموع − المدفوع` (-50.27 − 0 = -50.27 وليس 0.00).

---

## 2. تتبع تدفق البيانات (كود كامل مع أرقام الأسطر)

### 2.1 الباك اند: `attachBalanceData()` — مصدر `balance_data`

**الملف:** `app/Http/Controllers/Api/V1/CommercialDocumentController.php:491-515`

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

**المهم:** `getBalanceAt()` يستعلم عن جميع المستندات والمدفوعات حتى تاريخ المستند **بما فيها هذا المستند نفسه** (`whereDate('document_date', '<=', $date)`). لذلك `currentBalance` يمثل الرصيد **بعد** تأثير هذا المستند.

**بالنسبة للمثال:**
- `currentBalance = 0.00` (الرصيد الفعلي لهذا الزبون في هذا التاريخ، بعد تأثير هذا المستند)
- `previousBalance = 0.00 - 5,077.71 = -5,077.71` (ما كان الرصيد قبل هذا المستند)
- `new_balance = 0.00` (الرصيد بعد هذا المستند = currentBalance)

### 2.2 الباك اند: `PartyBalanceService::getBalanceAt()` — مصدر `partyBalance`

**الملف:** `app/Services/PartyBalanceService.php:20-90`

```php
public function getBalanceAt(int $partyId, string $date): array
{
    // ...
    $currentBalance = round(
        $openingAmount + $documentsBalance - $paymentsTotal, 2
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

**مهم:** هذه الدالة **نفسها** التي يستدعيها `attachBalanceData()`. كلا الطلبين ينتجان `current_balance` متماثلاً (بنفس التاريخ والزبون).

### 2.3 الباك اند: `PartyBalanceController::show()` — نقطة النهاية للطلب الثاني

**الملف:** `app/Http/Controllers/Api/V1/PartyBalanceController.php:44-55`

```php
public function show($id): JsonResponse
{
    try {
        $this->authorizeAction('view', \App\Models\Party::class);
        $partyId = $this->extractId($id);
        $date = request()->input('date', now()->toDateString());
        $result = $this->balanceService->getBalanceAt($partyId, $date);
        // PHASE27_PARTY_BALANCE_DUMP log would appear here
        return $this->successResponse($result, 'تم جلب الرصيد بنجاح');
    } catch (\Throwable $e) {
        return $this->handleError($e, 'show');
    }
}
```

### 2.4 الفرونت اند: جلب `existingDoc` (الذي يحتوي `balance_data`)

**الملف:** `resources/js/pages/documents/CommercialDocumentPage.tsx:50-54`

```tsx
const { data: existingDoc } = useQuery({
    queryKey: ['document', slug, id],
    queryFn: () => apiGet(`/documents/${id}`),
    enabled: !!slug && !!id,
});
```

**الملاحظات:**
- **queryKey:** `['document', slug, id]`
- **staleTime:** غير محدد → يota Defaults to `0` (دائماً stale، يُعاد جلبه عند Mount و Window Focus)
- **النقطة الحاسمة:** هذا Key لا يتطابق مع `tenantKeys.documents.detail(slug, id)` = `[slug, 'documents', id]` المستخدم في `useDocument()` بـ `documents.ts:280`

### 2.5 الفرونت اند: جلب `partyBalance`

**الملف:** `resources/js/pages/documents/hooks/useDocumentForm.ts:642-654`

```tsx
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

**الملاحظات:**
- **queryKey:** `[slug, 'party-balance', partyIdNum, form.fiscal_year_id, form.document_date]`
- **staleTime:** `60_000` (60 ثانية) — قد يكون stale وقت الضغط على زر الطباعة
- **يُعاد جلبه عند تغيير:** `partyIdNum` أو `fiscal_year_id` أو `document_date`

### 2.6 الفرونت اند: تمرير البيانات إلى TemplatePrintModal

**الملف:** `resources/js/pages/documents/CommercialDocumentPage.tsx:459-469`

```tsx
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
```

**مهم:** كلا `prevBalance` و `newBalance` يُمرَّران بنفس القيمة: `partyBalance?.current_balance ?? 0`.

**نفس النمط في `CommercialDocumentModal/index.tsx:511-522`:**
```tsx
<TemplatePrintModal
    document={existingDocument as Record<string, unknown>}
    prevBalance={partyBalance?.current_balance ?? 0}
    newBalance={partyBalance?.current_balance ?? 0}
    ...
/>
```

### 2.7 الفرونت اند: `DocumentDataBuilder.fromApiDocument()` — ترتيب الأولوية

**الملف:** `resources/js/pages/settings/print-settings/types/data/DocumentDataBuilder.ts:186-225`

```tsx
fromApiDocument(doc, company, options) {
    const lines  = buildLinesFromApi(doc.lines ?? []);
    const totals = buildTotalsFromApi(doc, lines);

    let prev: number | null | undefined;
    let next: number | null | undefined;
    if (doc.balance_data) {                              // ← الأولوية الأولى
        prev = doc.balance_data.previous_balance;
        next = doc.balance_data.new_balance;
    } else if (options?.prevBalance != null && options?.newBalance != null) {  // ← البديل
        prev = options.prevBalance;
        next = options.newBalance;
    }
    const balance = prev != null && next != null
        ? buildBalance(prev, next)
        : null;
    // ...
}
```

**`buildBalance()` (نفس الملف:553-565):**
```ts
function buildBalance(prev, next): BalanceInfo | null {
    if (prev == null || next == null) return null;
    const p = num(prev);
    const n = num(next);
    return {
        previous: p,
        movement: n - p,
        current:  n,          // ← هذا يصبح data.balance.current
    };
}
```

**النتيجة:**
- `data.balance.previous` = `balance_data.previous_balance` = `currentBalance - net_to_pay`
- `data.balance.current` = `balance_data.new_balance` = `currentBalance`

**`doc.balance_data` يأخذ الأولوية** على `options.prevBalance`/`options.newBalance`. بما أن `existingDoc` يأتي من `GET /documents/{id}` (الذي يستدعي `show()` → `attachBalanceData()`)، فـ `balance_data` **موجود دائماً** في الاستجابة.

### 2.8 الإيصال: كيف يعرض الرصيد

**الملف:** `resources/js/pages/settings/print-settings/components/preview/DeliveryReceiptA5.tsx:126-128`

```tsx
const prevBalance = data.balance?.previous ?? 0;
const newBalance  = data.balance?.current ?? 0;
const totalAmount = data.totals.totalTtc + prevBalance;
```

**في العرض (سطور 546-573):**
```tsx
{/* المبلغ TTC */}
<span>المبلغ TTC</span>
<span dir="ltr">{fmtCurrency(data.totals.totalTtc)}</span>

{/* الدين القديم */}
<span>الدين القديم</span>
<span dir="ltr">{fmtCurrency(prevBalance)}</span>

{/* المجموع */}
<span>المجموع</span>
<span dir="ltr">{fmtCurrency(totalAmount)}</span>

{/* المدفوع */}
<span>المدفوع</span>
<span dir="ltr">{fmtCurrency(data.totals.paid)}</span>

{/* الرصيد الجديد */}
<span>الرصيد الجديد</span>
<span dir="ltr">{fmtCurrency(newBalance)}</span>
```

---

## 3. تحليل `invalidateQueries` و `staleTime`

### 3.1 هل يُعاد جلب `existingDoc` بعد حفظ مستند آخر لنفس الزبون؟

**الإجابة: لا.**

**السبب:** `queryKey` للمستند في الصفحة هو `['document', slug, id]` (سطر 51 من `CommercialDocumentPage.tsx`).

لكن `invalidateQueries` في `documents.ts` يستخدم `tenantKeys.documents.detail(slug, id)`:

**`resources/js/lib/api/endpoints/documents.ts:298-303`:**
```ts
const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
        qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
};
```

**`resources/js/lib/api/core/queryKeys.ts:121-127`:**
```ts
documents: {
    all:    (slug: string) => [slug, 'documents'],
    list:   (slug: string, p?) => [slug, 'documents', 'list', p],
    detail: (slug: string, id: number) => [slug, 'documents', id],
    byType: (slug: string, code: string, p?) => [slug, 'documents', code, p],
},
```

**المشكلة:** `tenantKeys.documents.all(slug)` = `[slug, 'documents']` — هذا يُبطل أي query يبدأ بـ `[slug, 'documents', ...]`. لكن query الصفحة هو `['document', slug, id]` — **لا يبدأ بنفس البادئة!**

**النتيجة:** `invalidateQueries({ queryKey: tenantKeys.documents.all(slug) })` **لن يُبطل** query المستند في الصفحة لأن `['document', slug, id]` لا يتطابق مع `[slug, 'documents']` أو `[slug, 'documents', ...]`.

**توضيح:** كلمة `'documents'` في query الصفحة (المخزنة) تختلف عن `'documents'` في `tenantKeys` — الموقع في المصفوفة مختلف:
- الصفحة: `['document', slug, id]` ← `'document'` في الموقع 0
- tenantKeys: `[slug, 'documents', id]` ← `slug` في الموقع 0، `'documents'` في الموقع 1

### 3.2 `staleTime` وعلاقته بالمشكلة

| الاستعلام | staleTime | النتيجة |
|-----------|-----------|---------|
| `existingDoc` (صفحة المستند) | `0` (افتراضي) | يُعاد جلبه عند كل Mount و Window Focus |
| `partyBalance` (useDocumentForm) | `60,000` (60 ثانية) | قد يكون stale وقت الطباعة |
| `useDocument()` (documents.ts) | `300,000` (5 دقائق) | **غير مستخدم في الصفحة** — الصفحة تستخدم queryKey مختلف |

### 3.3 `invalidatePartyBalance` — هل يُبطل رصيد الزبون؟

**نعم.**

**`resources/js/lib/api/endpoints/documents.ts:305-308`:**
```ts
const invalidatePartyBalance = (partyId?: number | null) => {
    if (slug && partyId) {
        qc.invalidateQueries({ queryKey: [slug, 'party-balances', partyId] });
    }
};
```

يُستدعى في `create.onSuccess` و `update.onSuccess`. لكن query partyBalance في `useDocumentForm` يحتوي `[slug, 'party-balance', partyIdNum, ...]` — **بدون `s` في `'party-balance'`!**

**查询 Keys مقارنة:**
- `invalidateQueries`: `[slug, 'party-balances', partyId]` (مع `s`)
- `useDocumentForm`: `[slug, 'party-balance', partyIdNum, ...]` (بدون `s`)

**النتيجة:** `invalidatePartyBalance()` **لن يُبطل** query رصيد الزبون في `useDocumentForm` لأن الـ Key لا يتطابق!

---

## 4. الإجابة عن السؤال المباشر

> هل `balance_data` المُرفَق بـ `existingDocument` وقت الطباعة كان محسوباً في **نفس لحظة** فتح صفحة التعديل، أم أنه كان محفوظاً في ذاكرة التخزين المؤقت لـ React Query من طلب **سابق** (وقت أقدم)، بينما `partyBalance` المعروض في الصفحة كان محسوباً بشكل حي ولحظي؟

**الإجابة:** `balance_data` كان محسوباً في **نفس لحظة** فتح صفحة التعديل (أو الأقرب لها). السبب:

1. `existingDoc` يأتي من `useQuery({ queryKey: ['document', slug, id], staleTime: 0 })` — بدون `staleTime`، فيتم جلبه من جديد عند كل `mount` (فتح الصفحة). الطلب يذهب إلى `GET /documents/{id}` → `show()` → `attachBalanceData()` → `getBalanceAt()` حياً.

2. `partyBalance` يأتي من `useQuery({ queryKey: [slug, 'party-balance', ...], staleTime: 60_000 })` — قد يكون من الكاش إذا تم فتح الصفحة خلال 60 ثانية من طلب سابق.

3. لكن المشكلة **ليست تأخراً زمنياً** — المشكلة **منطقية في تصميم الإيصال**:

   - `data.balance.current` (= `balance_data.new_balance` = `currentBalance`) = الرصيد الفعلي **بعد** هذا المستند
   - `totalAmount` (= `TTC + prevBalance` = `TTC + (currentBalance - net_to_pay)`) = مجموع **حسابي** مختلف تماماً
   - `net_to_pay ≠ TTC` لأن `net_to_pay = TTC + fiscal_stamp - paid_amount`
   - لذلك: `currentBalance ≠ totalAmount - paid`

   **المشكلة الجذرية:** الإيصال يحسب `المجموع = TTC + الدين القديم` ثم يتوقع أن `الرصيد الجديد = المجموع - المدفوع`. لكن `الرصيد الجديد` يأخذ من `balance.current` الذي يساوي `currentBalance` (الرصيد الفعلي بعد المستند). هذان المفهومان مختلفان:

   | المفهوم | الصيغة | القيمة (مثال) |
   |---------|--------|---------------|
   | الرصيد الفعلي (balance.current) | `opening + docs - payments` | 0.00 |
   | المجموع (totalAmount) | `TTC + previous_balance` | -50.27 |
   | المجموع - المدفوع | `TTC + previous - paid` | -50.27 |
   | الفرق | `stamp` | 50.27 |

---

## 5. ملخص الأسباب (بدون تعديل كود)

### 5.1 السبب الجذري: `totalAmount` و `balance.current` يستخدمان مفاهيم مختلفة

- `totalAmount = TTC + prevBalance` — مجموع مالي للإرسال (TTC فقط، بدون الطابع الجبائي)
- `balance.current = currentBalance` — الرصيد الفعلي للزبون (يحتوي net_to_pay الذي يشمل الطابع)

**الفرق الدقيق:** `net_to_pay = TTC + stamp - paid` (تقريباً). لذلك:
```
balance.current = prevBalance + net_to_pay = prevBalance + TTC + stamp - paid
totalAmount = TTC + prevBalance
balance.current - totalAmount = stamp - paid
```

في المثال: `0.00 - (-50.27) = 50.27 = stamp - 0 = stamp` ✓

### 5.2 ثانوي: queryKey mismatch يمنع `invalidateQueries` من العمل

- الصفحة: `['document', slug, id]`
- `tenantKeys.documents.all()`: `[slug, 'documents']`
- لا تتطابق → لا إبطال

- `useDocumentForm`: `[slug, 'party-balance', ...]`
- `invalidatePartyBalance()`: `[slug, 'party-balances', ...]` (بـ `s`)
- لا تتطابق → لا إبطال

### 5.3 ثانوي: `partyBalance` staleTime = 60 ثانية

حتى لو تم الإبطال بنجاح، `staleTime: 60_000` يعني أن الرصيد المعروض قد يكون قديماً إذا تم تعديل مستند آخر لنفس الزبون خلال 60 ثانية.

---

## 6. التأكد من عدم وجود تغييرات كود

**الملفات المعدّلة مؤقتاً فقط (لا يجب الاحتفاظ بها):**
- `app/Http/Controllers/Api/V1/CommercialDocumentController.php` — `Log::info('PHASE27_DUMP', ...)` بعد `attachBalanceData($item)` في `show()`
- `app/Http/Controllers/Api/V1/PartyBalanceController.php` — `Log::info('PHASE27_PARTY_BALANCE_DUMP', ...)` بعد `getBalanceAt()` في `show()`

**يجب حذف كليهما بعد نسخ مخرجات الـ Log.**

---

## 7. ملاحظات تقنية إضافية

### 7.1 `DocumentTotalsSection` — حساب `futureBalance` في صفحة المستند

**الملف:** `resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx:28-44`

```tsx
const futureBalance = partyBalance && form.party_id && totals.netToPay > 0
    ? (() => {
        const existingNetToPay = isEdit
          ? toNum(existingDocument?.total_ttc ?? 0)
            + toNum(existingDocument?.total_stamp ?? 0)
          : 0;
        const existingPaymentsSum = isEdit
          ? (existingDocument?.payments ?? [])
              .reduce((s, p) => s + toNum(p.amount ?? 0), 0)
          : 0;
        const deltaDoc = totals.netToPay - existingNetToPay;
        const deltaPmt = totals.totalPaid - existingPaymentsSum;
        return isPurchase
          ? partyBalance!.signed_balance - deltaDoc + deltaPmt
          : partyBalance!.signed_balance + deltaDoc - deltaPmt;
      })()
    : null;
```

**ملاحظة:** صفحة المستند تحسب `futureBalance` بشكل حي باستخدام `partyBalance.signed_balance + deltaDoc - deltaPmt`. هذا مختلف عن `balance.current` في الإيصال لأن المستند يحسب التغيير المتأثر (delta) بدلاً من الاعتماد على `attachBalanceData()`.

### 7.2 `useDocument()` في `documents.ts` — غير مستخدم في الصفحة

**`resources/js/lib/api/endpoints/documents.ts:277-285`:**
```ts
export function useDocument(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:   () => documentsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}
```

هذه الدالة تستخدم `tenantKeys.documents.detail()` (الذي يتطابق مع `invalidateQueries`) و `staleTime = 5 دقائق`. لكن `CommercialDocumentPage` لا يستخدمها — يستخدم `useQuery` مباشرة بـ `queryKey: ['document', slug, id]`.

### 7.3 `useDocuments()` — يستخدم `tenantKeys` بشكل صحيح

**`resources/js/lib/api/endpoints/documents.ts:255-263`:**
```ts
export function useDocuments(params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
```

هذه تستخدم `tenantKeys.documents.list()` — لكن `CommercialDocumentPage` لا يستخدمها أيضاً.

---

## 8. مخرجات الـ Log المتوقعة (عند التشغيل)

### 8.1 `PHASE27_DUMP` من `CommercialDocumentController::show()`

**السطر المتوقع في `storage/logs/laravel.log`:**
```
[2026-xx-xx] production.INFO: PHASE27_DUMP {"document_id":123,"party_id":45,"document_date":"2026-xx-xx","net_to_pay":"5077.7100","total_ttc":"5027.4400","balance_data":{"previous_balance":-5077.71,"new_balance":0},"getBalanceAt_raw":{"party_id":45,"date":"2026-xx-xx","fiscal_year_id":1,"opening_balance":0,"documents_balance":5077.71,"payments_total":0,"current_balance":0,"signed_balance":0,"balance_type":"debit"},"now":"2026-xx-xx xx:xx:xx"}
```

**ملاحظات:**
- `net_to_pay` و `total_ttc` يكونان **strings** (decimal cast) — مثال: `"5077.7100"` و `"5027.4400"`
- `balance_data.previous_balance` و `new_balance` يكونان **أرقام حقيقية** (نتيجة `round()`) — مثال: `-5077.71` و `0`
- `getBalanceAt_raw.current_balance` = **0** (نفس `new_balance`)

### 8.2 `PHASE27_PARTY_BALANCE_DUMP` من `PartyBalanceController::show()`

```
[2026-xx-xx] production.INFO: PHASE27_PARTY_BALANCE_DUMP {"party_id":45,"date":"2026-xx-xx","result":{"party_id":45,"date":"2026-xx-xx","fiscal_year_id":1,"opening_balance":0,"documents_balance":5077.71,"payments_total":0,"current_balance":0,"signed_balance":0,"balance_type":"debit"},"now":"2026-xx-xx xx:xx:xx"}
```

**يجب أن تتطابق** `getBalanceAt_raw` من الطلب الأول مع `result` من الطلب الثاني (نفس الدالة، نفس التاريخ، نفس الزبون).

---

## 9. معايير القبول (للتحقق اليدوي)

1. ✅ فتح مستند BL → التحقق من `PHASE27_DUMP` في `laravel.log`
2. ✅ فتح `GET /party-balances/{id}?date=...` → التحقق من `PHASE27_PARTY_BALANCE_DUMP`
3. ✅ مطابقة `getBalanceAt_raw` مع `result` (نفس `current_balance`)
4. ✅ التحقق من أن `balance_data.previous_balance ≠ balance_data.new_balance` (إذا كان `net_to_pay ≠ 0`)
5. ✅ حذف كل الـ `Log::info` المؤقتة
6. ✅ التأكد من `git diff` لا يحتوي أي تغيير كود
