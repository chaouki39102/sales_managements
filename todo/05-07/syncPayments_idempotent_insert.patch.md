# Patch v2 — client_ref as an API/infra guard, not part of syncPayments' business logic

This replaces the previous patch's approach (firstOrCreate branching *inside*
the INSERT case). Instead, idempotency resolution happens as a single
pre-processing step, and syncPayments()'s UPDATE/INSERT/DELETE diff logic is
left exactly as it was — it never becomes aware that client_ref exists.

## 1. Migration & Payment.php fillable
Unchanged from the previous patch (payments.client_ref, unique per company_id;
add 'client_ref' to Payment::$fillable).

## 2. New private method — the entire "network protection" layer

Add this method to CommercialDocumentService.php (near syncPayments):

```php
/**
 * طبقة حماية API — منفصلة تماماً عن منطق syncPayments المحاسبي (الذي لا
 * يعرف شيئاً عن client_ref ولا يحتاج لمعرفته).
 *
 * مسؤوليتها الوحيدة: لو كان صف وارد "جديداً" (بلا id) لكنه يحمل client_ref
 * سبق أن تحوّل فعلاً إلى دفعة حقيقية في محاولة سابقة لنفس الطلب (نفس
 * الطلب أُعيد إرساله بسبب نقرة مزدوجة أو timeout شبكة)، فإننا نُلحق به الـ id
 * الحقيقي قبل أن يصل إلى syncPayments. من منظور syncPayments، هذا الصف
 * أصبح "دفعة موجودة" فيمر عبر مسار UPDATE العادي — وهو idempotent بطبيعته
 * أصلاً: نفس القيم = delta صفر = لا إعادة تعديل على الخزينة.
 */
private function resolveIdempotentPaymentIds(int $companyId, array $payments): array
{
    foreach ($payments as &$p) {
        if (empty($p['id']) && !empty($p['client_ref'])) {
            $existingId = Payment::where('company_id', $companyId)
                ->where('client_ref', $p['client_ref'])
                ->value('id');
            if ($existingId) {
                $p['id'] = $existingId;
            }
        }
    }
    unset($p);
    return $payments;
}
```

## 3. syncPayments() — one line added at the top, nothing else changes

```php
public function syncPayments(CommercialDocument $document, array $payments): void
{
    // ── طبقة الحماية (API/شبكة) — السطر الوحيد الذي "يعرف" بوجود client_ref ──
    $payments = $this->resolveIdempotentPaymentIds($document->company_id, $payments);

    $companyId = $document->company_id;
    // ... البقية بالضبط كما كانت — لا تغيير آخر في منطق DELETE/UPDATE
```

## 4. INSERT branch — one new key only (still persisting the token for future retries)

Everything in the `else { // ── INSERT جديد ── }` branch stays exactly as it
was. Add a single key to the `Payment::create([...])` array so a *first*
attempt's client_ref is stored and can be matched by the guard on any later
retry:

```php
$payment = Payment::create([
    'company_id'          => $companyId,
    'client_ref'          => $paymentData['client_ref'] ?? null,   // ← فقط هذا السطر جديد
    'payment_mode_id'     => (int) $paymentData['payment_mode_id'],
    'treasury_account_id' => isset($paymentData['treasury_account_id'])
        ? (int) $paymentData['treasury_account_id'] : null,
    'amount'              => $amount,
    'payment_date'        => $paymentData['payment_date'] ?? $document->document_date,
    'reference'           => $paymentData['reference'] ?? null,
    'notes'               => $paymentData['notes'] ?? null,
    'user_id'             => auth()->id(),
    'fiscal_year_id'      => $document->fiscal_year_id,
    'party_id'            => $document->party_id,
    'currency_id'         => $document->currency_id,
    'payment_number'      => $this->generatePaymentNumber($companyId),
    'status'              => 'confirmed',
]);
```

Nothing else in that branch (attach, treasury adjustment) needs to change —
they only ever run for a genuine first insert, exactly as before.

## What this buys vs. the previous version
- syncPayments() reads the same as it did before this whole conversation
  started, except for one call at the top. A reviewer auditing the payment
  business logic six months from now sees pure UPDATE/INSERT/DELETE — no
  network-retry concerns mixed in.
- The guard is a single, isolated, unit-testable function with one job.
- If you ever want to drop client_ref entirely (e.g. move idempotency to a
  generic API-level `Idempotency-Key` header instead), you delete the guard
  call and the one `client_ref` key in the create() array — syncPayments
  itself never has to be touched again.

## Residual gap (worth knowing, optional to close)
The guard's SELECT-then-decide is not atomic with the later INSERT. Two
requests arriving within the same few milliseconds (true concurrency, not
sequential retry) could both pass the guard seeing "no existing row yet" and
both attempt Payment::create() — the second will hit the unique constraint
on (company_id, client_ref) and throw a QueryException (visible to the user
as a failed save, not a silent duplicate — the data stays correct, but the
UX for that request is an error rather than a graceful merge).

This is a much narrower window than the sequential double-click/timeout-retry
case the guard already fully covers, and closing it requires a try/catch
around the create() call to recover by re-fetching on constraint violation.
Given this is a single-cashier-per-terminal POS flow rather than a
multi-writer concurrent system, I'd leave it as-is unless you have a
specific reason to expect literally-simultaneous duplicate submissions — say
so and I'll add the catch-and-recover.
