<?php

namespace App\Observers;

use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\Tax\TAPCalculator;
use Illuminate\Support\Facades\Log;

class CommercialDocumentObserver
{
    /**
     * قبل الحفظ: حساب المجاميع المالية من الأسطر
     */
    public function saving(CommercialDocument $document): void
    {
        // لا تحسب إذا لم تكن الأسطر محملة
        if (!$document->relationLoaded('lines')) {
            return;
        }

        // إذا كانت الأسطر فارغة، لا تفعل شيئاً
        if ($document->lines->isEmpty()) {
            return;
        }

        $this->calculateDocumentTotals($document);
    }

    /**
     * حساب إجماليات الوثيقة بناءً على الأسطر (التي حسبت نفسها مسبقاً)
     */
    protected function calculateDocumentTotals(CommercialDocument $document): void
    {
        $totalHT = $document->lines->sum('total_ht');
        $totalTVA = $document->lines->sum('total_tva');
        $totalDiscount = $document->lines->sum('discount_amount');
        $totalTTC = $totalHT + $totalTVA;

        $document->total_ht = $totalHT;
        $document->total_tva = $totalTVA;
        $document->total_discount = $totalDiscount;
        $document->total_ttc = $totalTTC;

        // 3. حساب الطابع الجبائي (Fiscal Stamp)
        $document->total_stamp = app(FiscalStampCalculator::class)->calculate($document);

        // 4. حساب TAP (إن وجدت)
        $document->total_tap = app(TAPCalculator::class)->calculate($document);

        // 5. حساب صافي المبلغ المستحق
        $document->net_to_pay = $document->total_ttc + $document->total_stamp + $document->total_tap;

        // 6. حساب المتبقي
        $document->remaining_amount = $document->net_to_pay - ($document->paid_amount ?? 0);
    }

    /**
     * بعد الحفظ: تحديث حالة الوثيقة تلقائياً
     */
    public function saved(CommercialDocument $document): void
    {
        // إذا تم دفع كامل المبلغ، نغير الحالة إلى "مدفوع"
        if ($document->remaining_amount <= 0) {
            $paidStatus = DocumentStatus::where('name', 'paid')->first();
            if ($paidStatus && $document->document_status_id !== $paidStatus->id) {
                // استخدام saveQuietly لتجنب استدعاء Observer مرة أخرى
                $document->document_status_id = $paidStatus->id;
                $document->saveQuietly();
            }
        }
    }
}
