<?php

namespace App\Observers;

use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Support\Facades\Log;

/**
 * CommercialDocumentObserver
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * المسؤولية: طبقة احتياطية لحساب الإجماليات وتحديث الحالة تلقائياً.
 *
 * ══ متى يُشغَّل ════════════════════════════════════════════════════════════
 *  saving()  → قبل كل save() أو update() عادي
 *  saved()   → بعد كل save() أو update() ناجح
 *
 * ══ ما لا يُشغّله ══════════════════════════════════════════════════════════
 *  saveQuietly()   → مقصود — نتجنب الحلقات
 *  updateQuietly() → مقصود — CommercialDocumentService يستخدمه
 *
 * ══ سيناريوهات saving() ════════════════════════════════════════════════════
 *  S1. الأسطر محملة وغير فارغة → إعادة حساب الإجماليات
 *  S2. الأسطر غير محملة → تجاوز (لا استعلام DB)
 *  S3. الأسطر فارغة → تجاوز
 *
 * ══ سيناريوهات saved() ═════════════════════════════════════════════════════
 *  S4. remaining_amount <= 0.001 و net_to_pay > 0 → تحديث الحالة إلى paid
 *      لكن فقط إذا كانت الحالة الحالية في: [validated, partially_paid, overdue, pending]
 *      لا تُحوِّل: draft, cancelled, returned, paid (بالفعل)
 *  S5. باقي الحالات → لا شيء
 *
 * ══ سيناريوهات الدفعات الجزئية ══════════════════════════════════════════════
 *  S6. 0 < remaining_amount < net_to_pay → يجب أن تتحول إلى partially_paid
 *      (هذا يُعالَج هنا أيضاً)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class CommercialDocumentObserver
{
    /**
     * قبل الحفظ: حساب الإجماليات إذا كانت الأسطر محملة.
     */
    public function saving(CommercialDocument $document): void
    {
        // S2: الأسطر غير محملة → لا استعلام DB
        if (!$document->relationLoaded('lines')) {
            return;
        }

        // S3: الأسطر فارغة → تجاوز
        if ($document->lines->isEmpty()) {
            return;
        }

        // S1: الأسطر محملة → إعادة حساب
        $this->calculateDocumentTotals($document);
    }

    /**
     * حساب إجماليات الوثيقة من الأسطر المحملة.
     * تُستدعى فقط من saving() — لا تستدعي save() داخلياً.
     */
    protected function calculateDocumentTotals(CommercialDocument $document): void
    {
        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        // الطابع الجبائي
        $totalStamp = 0.0;
        try {
            $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
        } catch (\Throwable $e) {
            Log::warning("CommercialDocumentObserver [saving]: فشل حساب الطابع للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
        }

        $netToPay   = $totalTtc + $totalStamp;
        $paidAmount = (float) ($document->paid_amount ?? 0);

        // تعيين القيم مباشرة على النموذج — لا save() هنا
        $document->total_ht         = round($totalHt,       4);
        $document->total_tva        = round($totalTva,      4);
        $document->total_discount   = round($totalDiscount, 4);
        $document->total_stamp      = round($totalStamp,    4);
        $document->total_ttc        = round($totalTtc,      4);
        $document->net_to_pay       = round($netToPay,      4);
        $document->remaining_amount = round(max(0, $netToPay - $paidAmount), 4);
    }

    /**
     * بعد الحفظ: تحديث الحالة حسب remaining_amount.
     *
     * ══ الحالات المُعالَجة ══════════════════════════════════════════════════
     *
     * S4. remaining_amount <= 0.001 و net_to_pay > 0
     *     و الحالة في [validated, partially_paid, overdue, pending]
     *     → تحديث إلى "paid"
     *
     * S6. 0 < remaining_amount < net_to_pay (دفع جزئي)
     *     و الحالة في [validated, overdue, pending]
     *     → تحديث إلى "partially_paid"
     *
     * S5. باقي الحالات → لا تعديل
     *
     * ════════════════════════════════════════════════════════════════════════
     */
    public function saved(CommercialDocument $document): void
    {
        // لا تعديل على المستندات المقفلة أو المُصدَّرة للمحاسبة
        if ($document->is_locked || $document->is_exported_to_accounting) {
            return;
        }

        $netToPay   = (float) $document->net_to_pay;
        $remaining  = (float) $document->remaining_amount;
        $paidAmount = (float) $document->paid_amount;

        // لا منطق إذا لم يكن هناك مبلغ مستحق
        if ($netToPay <= 0) return;

        // قراءة اسم الحالة الحالية (نستخدم العلاقة إذا كانت محملة وإلا نستعلم)
        $currentStatusName = $this->resolveCurrentStatusName($document);

        // الحالات المحمية — لا تُعدَّل بأي حال
        if (in_array($currentStatusName, ['cancelled', 'returned', 'draft'], true)) {
            return;
        }

        try {
            // ── S4: دفع كامل → paid ─────────────────────────────────────────
            if ($remaining <= 0.001) {
                $this->transitionToPaid($document, $currentStatusName);
                return;
            }

            // ── S6: دفع جزئي → partially_paid ───────────────────────────────
            if ($paidAmount > 0.001 && $remaining > 0.001) {
                $this->transitionToPartiallyPaid($document, $currentStatusName);
            }

        } catch (\Throwable $e) {
            Log::warning("CommercialDocumentObserver [saved]: فشل تحديث الحالة للوثيقة #{$document->id}", [
                'error'          => $e->getMessage(),
                'current_status' => $currentStatusName,
                'remaining'      => $remaining,
                'net_to_pay'     => $netToPay,
            ]);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * يقرأ اسم الحالة الحالية من العلاقة المحملة أو من الاستعلام.
     */
    private function resolveCurrentStatusName(CommercialDocument $document): string
    {
        if ($document->relationLoaded('documentStatus') && $document->documentStatus) {
            return $document->documentStatus->name ?? '';
        }

        return (string) DocumentStatus::where('id', $document->document_status_id)
            ->value('name') ?? '';
    }

    /**
     * S4: الانتقال إلى "paid".
     * مسموح فقط من: [validated, partially_paid, overdue, pending]
     */
    private function transitionToPaid(CommercialDocument $document, string $currentStatusName): void
    {
        $allowedFrom = ['validated', 'partially_paid', 'overdue', 'pending'];

        if (!in_array($currentStatusName, $allowedFrom, true)) {
            return;
        }

        $paidStatusId = DocumentStatus::where('company_id', $document->company_id)
            ->where('name', 'paid')
            ->value('id');

        if (!$paidStatusId) {
            Log::warning("CommercialDocumentObserver: لم يُعثر على حالة 'paid' للشركة #{$document->company_id}");
            return;
        }

        // لا تُعدِّل إذا كانت الحالة بالفعل paid
        if ($document->document_status_id === $paidStatusId) {
            return;
        }

        // ✅ saveQuietly() لا يُشغِّل الـ Observer مرة أخرى
        $document->document_status_id = $paidStatusId;
        $document->saveQuietly();
    }

    /**
     * S6: الانتقال إلى "partially_paid".
     * مسموح فقط من: [validated, overdue, pending]
     * لا ينتقل من paid (قد يكون تصحيح متأخر)
     */
    private function transitionToPartiallyPaid(CommercialDocument $document, string $currentStatusName): void
    {
        $allowedFrom = ['validated', 'overdue', 'pending'];

        if (!in_array($currentStatusName, $allowedFrom, true)) {
            return;
        }

        $partialStatusId = DocumentStatus::where('company_id', $document->company_id)
            ->where('name', 'partially_paid')
            ->value('id');

        if (!$partialStatusId) {
            Log::warning("CommercialDocumentObserver: لم يُعثر على حالة 'partially_paid' للشركة #{$document->company_id}");
            return;
        }

        if ($document->document_status_id === $partialStatusId) {
            return;
        }

        $document->document_status_id = $partialStatusId;
        $document->saveQuietly();
    }
}
