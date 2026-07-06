<?php

namespace App\Core\Services\Concerns;

use App\Models\CommercialDocument;
use App\Models\TreasuryAccount;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ResolvesPaymentDirection
 * ────────────────────────────────────────────────────────────────────────────
 * ✅ يحل مشكلة ازدواجية مكتشَفة بتدقيق المدفوعات:
 *    resolveDirection() / resolvePaymentDirection() و adjustTreasuryBalance()
 *    و oppositeDirection() كانت مُكرَّرة حرفياً (نفس المنطق، نفس الكود) في كل
 *    من PaymentService.php و CommercialDocumentService.php. أي قاعدة عمل
 *    جديدة (مثال: مستندات المرتجع يجب أن تعكس الاتجاه) كانت تحتاج تعديلاً في
 *    مكانين منفصلين — مع خطر حقيقي أن يُعدَّل أحدهما وتُنسى الثاني، فتُصبح نفس
 *    الدفعة "داخلة" في مسار و"خارجة" في مسار آخر لنفس السيناريو بالضبط.
 *
 * الآن: مصدر واحد فقط للحقيقة. أي تعديل مستقبلي على قواعد الاتجاه يُكتب هنا
 * مرة واحدة، وينعكس تلقائياً على كل الخدمات التي تستخدم هذا الـtrait.
 * ════════════════════════════════════════════════════════════════════════════
 */
trait ResolvesPaymentDirection
{
    /**
     * تحديد اتجاه دفعة مستقلة (سياق PaymentService — لا مستند تجاري مرتبط
     * بالضرورة، فقط بيانات الدفعة الخام).
     *
     *   بدون party               → out (مصروف)
     *   party + purchase          → out (ندفع للمورد)
     *   party + sale أو unknown  → in  (نقبض من الزبون)
     */
    protected function resolveDirectionFromData(array $data): string
    {
        if (empty($data['party_id'])) {
            return 'out';
        }

        if (($data['document_base_operation'] ?? null) === 'purchase') {
            return 'out';
        }

        return 'in';
    }

    /**
     * تحديد اتجاه دفعة مرتبطة بمستند تجاري (سياق CommercialDocumentService).
     */
    protected function resolveDirectionFromDocument(CommercialDocument $document): string
    {
        $baseOp = $document->documentType?->documentBaseOperation?->name;
        return $baseOp === 'purchase' ? 'out' : 'in';
    }

    protected function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }

    /**
     * تحديث current_balance كـ denormalized cache على TreasuryAccount.
     * المصدر الحقيقي (لأي تدقيق أو إعادة بناء): TreasuryBalanceService::getTreasuryBalanceAt()
     */
    protected function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        if ($accountId <= 0 || $amount <= 0) return;

        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }
}
