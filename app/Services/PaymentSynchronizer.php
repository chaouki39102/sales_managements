<?php

namespace App\Services;

use App\Core\Services\Concerns\ResolvesPaymentDirection;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PaymentSynchronizer — عزل كامل لدورة حياة الدفعات
 * ════════════════════════════════════════════════════════════════════════════
 *
 * المسؤوليات:
 *   1. مزامنة الدفعات مع المستند (UPSERT/DELETE pattern)
 *   2. حماية API/شبكة (idempotency via client_ref)
 *   3. تعديل رصيد الخزينة بعد كل تغيير
 *   4. إعادة حساب paid_amount / remaining_amount
 *   5. مزامنة حالة المستند (paid / partially_paid)
 *   6. حساب وتثبيت الرصيد السابق والجديد
 *   7. توليد أرقام الدفعات (PAY-YYYY-NNNNNN)
 *
 * لا يمسك حالة — كل العمليات تعتمد على الموديلات الممررة.
 * ════════════════════════════════════════════════════════════════════════════
 */
class PaymentSynchronizer
{
    use ResolvesPaymentDirection;

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC: مزامنة الدفعات — UPSERT/DELETE pattern
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * مزامنة الدفعات مع مستند تجاري.
     *
     * المبدأ:
     *   - دفعة مع id     → UPDATE موجود
     *   - دفعة بدون id   → INSERT جديد
     *   - دفعة محذوفة من الطلب → DELETE pivot + حذف الدفعة إن لم تكن مرتبطة بمستند آخر
     *
     * بعد المزامنة: يُعاد حساب paid_amount و remaining_amount من الصفر.
     */
    public function syncPayments(CommercialDocument $document, array $payments): void
    {
        $companyId = $document->company_id;

        // ── طبقة الحماية (API/شبكة) — تمنع إدراج مكرر عند إعادة إرسال الطلب ──
        $payments = $this->resolveIdempotentPaymentIds($companyId, $payments);

        // 1. الدفعات الحالية المرتبطة بالمستند
        $existingPivotIds = DB::table('document_payment')
            ->where('commercial_document_id', $document->id)
            ->pluck('payment_id')
            ->toArray();

        // 2. IDs الدفعات الواردة
        $incomingIds = array_values(array_filter(array_map(
            fn($p) => isset($p['id']) ? (int) $p['id'] : null,
            $payments,
        )));

        // 3. DELETE: في pivot لكن ليس في الوارد
        $toDelete = array_diff($existingPivotIds, $incomingIds);
        foreach ($toDelete as $paymentId) {
            DB::table('document_payment')
                ->where('commercial_document_id', $document->id)
                ->where('payment_id', $paymentId)
                ->delete();

            $payment = Payment::find($paymentId);
            if ($payment && $payment->status === 'confirmed' && $payment->treasury_account_id) {
                $this->adjustTreasuryBalance(
                    (int) $payment->treasury_account_id,
                    (float) $payment->amount,
                    $this->oppositeDirection($this->resolveDirectionFromDocument($document)),
                );
            }

            $otherAttachments = DB::table('document_payment')
                ->where('payment_id', $paymentId)
                ->where('commercial_document_id', '!=', $document->id)
                ->count();
            if ($otherAttachments === 0 && $payment) {
                $payment->delete();
            }
        }

        // 4. UPSERT: إنشاء أو تحديث
        foreach ($payments as $paymentData) {
            $paymentId = isset($paymentData['id']) ? (int) $paymentData['id'] : null;
            $amount    = (float) ($paymentData['amount'] ?? 0);
            if ($amount <= 0) continue;

            if ($paymentId) {
                // ── UPDATE موجود ──────────────────────────────────────────
                $payment = Payment::find($paymentId);
                if (!$payment) continue;

                $oldAmount = (float) $payment->amount;
                $oldAccountId = (int) $payment->treasury_account_id;
                $oldDirection = $this->resolveDirectionFromDocument($document);

                $payment->update([
                    'amount'              => $amount,
                    'payment_mode_id'     => (int) ($paymentData['payment_mode_id'] ?? $payment->payment_mode_id),
                    'treasury_account_id' => isset($paymentData['treasury_account_id'])
                        ? (int) $paymentData['treasury_account_id']
                        : $payment->treasury_account_id,
                    'reference'           => $paymentData['reference'] ?? $payment->reference,
                    'notes'               => $paymentData['notes'] ?? $payment->notes,
                    'payment_date'        => $paymentData['payment_date'] ?? $payment->payment_date,
                ]);

                DB::table('document_payment')
                    ->where('commercial_document_id', $document->id)
                    ->where('payment_id', $paymentId)
                    ->update(['amount_applied' => $amount]);

                $newAccountId = (int) $payment->treasury_account_id;
                $delta = $amount - $oldAmount;
                if (abs($delta) > 0.001 && $payment->status === 'confirmed' && $newAccountId > 0) {
                    if ($oldAccountId !== $newAccountId) {
                        $this->adjustTreasuryBalance($oldAccountId, $oldAmount, $this->oppositeDirection($oldDirection));
                        $this->adjustTreasuryBalance($newAccountId, $amount, $oldDirection);
                    } else {
                        $this->adjustTreasuryBalance($newAccountId, abs($delta), $delta > 0 ? $oldDirection : $this->oppositeDirection($oldDirection));
                    }
                }
            } else {
                // ── INSERT جديد ──────────────────────────────────────────
                $direction = $this->resolveDirectionFromDocument($document);

                // حساب الخزينة يُستنتج من طريقة الدفع إن لم يُرسل في الحمولة
                // (العمود NOT NULL — لا يمكن إدراج دفعة بدونه)
                $treasuryAccountId = isset($paymentData['treasury_account_id'])
                    ? (int) $paymentData['treasury_account_id']
                    : 0;
                if (!$treasuryAccountId) {
                    $treasuryAccountId = (int) \App\Models\PaymentMode::where('id', (int) $paymentData['payment_mode_id'])
                        ->value('treasury_account_id') ?: 0;
                }

                $payment = Payment::create([
                    'company_id'          => $companyId,
                    'client_ref'          => $paymentData['client_ref'] ?? null,
                    'payment_mode_id'     => (int) $paymentData['payment_mode_id'],
                    'treasury_account_id' => $treasuryAccountId ?: null,
                    'amount'              => $amount,
                    'direction'           => $direction,
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

                $document->payments()->attach($payment->id, [
                    'company_id'     => $companyId,
                    'amount_applied' => $amount,
                    'notes'          => $paymentData['notes'] ?? null,
                ]);

                if ($payment->treasury_account_id && $payment->status === 'confirmed') {
                    $this->adjustTreasuryBalance($payment->treasury_account_id, $amount, $direction);
                }
            }
        }

        // 5. إعادة حساب paid_amount و remaining_amount من الصفر
        $this->recalculatePaymentAmounts($document);

        // 6. مزامنة حالة المستند (paid / partially_paid / validated)
        $this->syncDocumentStatus($document);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC: حساب وتثبيت الرصيد
    // ═══════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: حماية API/شبكة
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * طبقة حماية API/شبكة — منفصلة تماماً عن منطق syncPayments المحاسبي.
     *
     * إذا كان صف وارد "جديداً" (بلا id) لكنه يحمل client_ref سبق أن تحوّل
     * فعلياً إلى دفعة حقيقية في محاولة سابقة لنفس الطلب، نُلحق به الـ id
     * الحقيقي قبل أن يصل إلى syncPayments.
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

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إعادة حساب المبالغ
    // ═══════════════════════════════════════════════════════════════════════

    private function recalculatePaymentAmounts(CommercialDocument $document): void
    {
        $paidAmount = (float) DB::table('document_payment')
            ->where('commercial_document_id', $document->id)
            ->sum('amount_applied');

        $document->updateQuietly([
            'paid_amount'      => round($paidAmount, 2),
            'remaining_amount' => round(max(0, (float) $document->net_to_pay - $paidAmount), 2),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: مزامنة حالة المستند
    // ═══════════════════════════════════════════════════════════════════════

    private function syncDocumentStatus(CommercialDocument $document): void
    {
        $netToPay   = (float) $document->net_to_pay;
        $remaining  = (float) $document->remaining_amount;
        $paidAmount = (float) $document->paid_amount;

        if ($netToPay <= 0) return;

        $currentStatus = $document->documentStatus?->name
            ?? DocumentStatus::where('id', $document->document_status_id)->value('name');

        if (in_array($currentStatus, ['cancelled', 'returned', 'draft'], true)) return;

        if ($remaining <= 0.001) {
            $paidId = $this->getStatusId($document->company_id, 'paid');
            if ($paidId && $document->document_status_id !== $paidId) {
                $document->updateQuietly(['document_status_id' => $paidId]);
            }
            return;
        }

        if ($paidAmount > 0.001 && $remaining > 0.001) {
            $partialId = $this->getStatusId($document->company_id, 'partially_paid');
            if ($partialId && $document->document_status_id !== $partialId) {
                $document->updateQuietly(['document_status_id' => $partialId]);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: توليد رقم الدفعة
    // ═══════════════════════════════════════════════════════════════════════

    private function generatePaymentNumber(int $companyId): string
    {
        return DB::transaction(function () use ($companyId) {
            $year = date('Y');
            $last = Payment::where('company_id', $companyId)
                ->where('payment_number', 'like', "PAY-{$year}-%")
                ->orderByDesc('id')
                ->withTrashed()
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($last && $last->payment_number) {
                $parts = explode('-', $last->payment_number);
                $seq   = ((int) end($parts)) + 1;
            }

            return sprintf('PAY-%s-%06d', $year, $seq);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private function getStatusId(int $companyId, string $name): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', $name)
            ->value('id');
    }
}
