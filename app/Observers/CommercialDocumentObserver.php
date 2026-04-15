<?php

namespace App\Observers;

use App\Models\CommercialDocument;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\Tax\TAPCalculator;


/**
 * مراقب لحساب المجاميع المالية تلقائياً
 * يعمل فقط عند وجود أسطر (lines) محملة
 */
class CommercialDocumentObserver
{
    /**
     * يعمل قبل الحفظ (Create + Update)
     */
    public function saving(CommercialDocument $document): void
    {
        // ✅ تحقق من وجود الأسطر
        if (!$document->relationLoaded('lines') || $document->lines->isEmpty()) {
            return; // لا أسطر = لا حسابات
        }

        $this->calculateTotals($document);
    }

    /**
     * حساب المجاميع المالية
     */
    protected function calculateTotals(CommercialDocument $document): void
    {
        $totalHT = 0;
        $totalTVA = 0;
        $totalTTC = 0;
        $totalDiscount = 0;

        // 1. حساب مجاميع الأسطر
        foreach ($document->lines as $line) {
            // تأكد من حساب كل سطر قبل الجمع
            $line->calculateLineTotals();

            $totalHT += $line->total_ht;
            $totalTVA += $line->total_tva;
            $totalTTC += $line->total_ttc;
            $totalDiscount += $line->discount_amount;
        }

        // 2. تحديث الفاتورة
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
        $document->remaining_amount = $document->net_to_pay - $document->paid_amount;
    }

    /**
     * بعد الحفظ: تحديث حالة "مدفوعة بالكامل"
     */
    public function saved(CommercialDocument $document): void
    {
        if ($document->remaining_amount <= 0 && $document->status !== 'paid') {
            $document->updateQuietly(['status' => 'paid']); // بدون Triggers
        }
    }
}
