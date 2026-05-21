<?php

namespace App\Observers;

use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\Tax\TAPCalculator;
use Illuminate\Support\Facades\Log;

/**
 * CommercialDocumentObserver
 * ══════════════════════════════════════════════════════════════════
 *
 * ⚠️ متى يُشغَّل هذا الـ Observer؟
 * - saving()  → قبل كل save() أو update() (بما فيها المباشرة)
 * - saved()   → بعد كل save() أو update() ناجح
 *
 * ⚠️ ما لا يُشغّله:
 * - saveQuietly()   → لا يشغّل Observers (مقصود — نتجنب الحلقات)
 * - updateQuietly() → لا يشغّل Observers
 *
 * ✅ CommercialDocumentService::calculateTotals() تستخدم updateQuietly()
 *    لذا لن يُشغَّل saving() عند حساب الإجماليات من الخدمة.
 *
 * ✅ هذا الـ Observer يعمل كطبقة احتياطية فقط:
 *    إذا حُدّثت الوثيقة مباشرة (مثل $document->save() في اختبار)،
 *    يُحسب الإجماليات إذا كانت الأسطر محملة.
 *
 * التسجيل: AppServiceProvider::boot()
 *   CommercialDocument::observe(CommercialDocumentObserver::class);
 * ══════════════════════════════════════════════════════════════════
 */
class CommercialDocumentObserver
{
    /**
     * قبل الحفظ: حساب المجاميع من الأسطر إذا كانت محملة.
     *
     * ✅ نتحقق من relationLoaded أولاً — إذا لم تكن الأسطر محملة
     *    فالـ Observer يتجاوز الحساب (لا يستدعي DB).
     * ✅ إذا كانت الأسطر فارغة نتجاوز أيضاً.
     */
    public function saving(CommercialDocument $document): void
    {
        if (!$document->relationLoaded('lines')) {
            return;
        }

        if ($document->lines->isEmpty()) {
            return;
        }

        $this->calculateDocumentTotals($document);
    }

    /**
     * حساب إجماليات الوثيقة من الأسطر المحملة.
     *
     * ✅ الأسطر تكون قد حُسبت مسبقاً بواسطة CommercialDocumentLineObserver
     * ✅ نستخدم القيم الموجودة في الـ collection (لا استعلام إضافي)
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
            Log::warning("CommercialDocumentObserver: فشل حساب الطابع الجبائي للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
        }

        // TAP
        $totalTap = 0.0;
        try {
            if (class_exists(TAPCalculator::class)) {
                $totalTap = (float) app(TAPCalculator::class)->calculate($document);
            }
        } catch (\Throwable $e) {
            Log::warning("CommercialDocumentObserver: فشل حساب TAP للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
        }

        $netToPay = $totalTtc + $totalStamp + $totalTap;

        // تعيين القيم مباشرة على الـ model (لا save هنا — نحن داخل saving())
        $document->total_ht       = round($totalHt,       4);
        $document->total_tva      = round($totalTva,      4);
        $document->total_discount = round($totalDiscount, 4);
        $document->total_stamp    = round($totalStamp,    4);
        $document->total_tap      = round($totalTap,      4);
        $document->total_ttc      = round($totalTtc,      4);
        $document->net_to_pay     = round($netToPay,      4);

        // remaining_amount = net_to_pay - paid_amount (لا نصفّر paid_amount)
        $paidAmount               = (float) ($document->paid_amount ?? 0);
        $document->remaining_amount = round(max(0, $netToPay - $paidAmount), 4);
    }

    /**
     * بعد الحفظ: تحديث حالة الوثيقة إلى "مدفوع" إذا اكتمل الدفع.
     *
     * ✅ نستخدم saveQuietly() لتجنب حلقة لا نهائية
     * ✅ نتحقق من remaining_amount بدقة (float comparison مع epsilon)
     * ✅ نتحقق من أن الحالة الحالية ليست "paid" مسبقاً
     * ✅ try/catch لمنع فشل الحالة من إفشال العملية الأصلية
     */
    public function saved(CommercialDocument $document): void
    {
        $remaining = (float) $document->remaining_amount;

        // ✅ مقارنة float آمنة (epsilon = 0.001 لتجنب مشاكل التقريب)
        if ($remaining > 0.001) {
            return;
        }

        // تحقق من وجود net_to_pay > 0 (لا نغيّر حالة الوثائق الصفرية تلقائياً)
        $netToPay = (float) $document->net_to_pay;
        if ($netToPay <= 0) {
            return;
        }

        try {
            $paidStatus = DocumentStatus::where('company_id', $document->company_id)
                ->where('name', 'paid')
                ->first();

            if (!$paidStatus) {
                Log::warning("CommercialDocumentObserver: لم يُعثر على حالة 'paid' للشركة #{$document->company_id}");
                return;
            }

            // تجنب التحديث إذا كانت الحالة بالفعل 'paid'
            if ($document->document_status_id === $paidStatus->id) {
                return;
            }

            // ✅ saveQuietly() لا يشغّل Observers مرة أخرى
            $document->document_status_id = $paidStatus->id;
            $document->saveQuietly();

        } catch (\Throwable $e) {
            // لا نوقف العملية الأصلية بسبب فشل تحديث الحالة
            Log::warning("CommercialDocumentObserver: فشل تحديث الحالة للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
