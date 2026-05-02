<?php

namespace App\Observers;

use App\Models\CommercialDocumentLine;
use Illuminate\Support\Facades\Log;

class CommercialDocumentLineObserver
{
    /**
     * قبل الحفظ: حساب المجاميع تلقائياً
     */
    public function saving(CommercialDocumentLine $line): void
    {
        // لا تحسب إذا لم تتغير القيم الأساسية (لتجنب الحساب غير الضروري)
        if (!$line->isDirty(['quantity', 'unit_price_ht', 'discount_percentage', 'tva_rate'])) {
            return;
        }

        $this->calculateLineTotals($line);
    }

    /**
     * حساب جميع حقول المجاميع للسطر
     */
    protected function calculateLineTotals(CommercialDocumentLine $line): void
    {
        $quantity = $line->quantity ?? 0;
        $unitPrice = $line->unit_price_ht ?? 0;
        $discountPercentage = $line->discount_percentage ?? 0;
        $tvaRate = $line->tva_rate ?? 0;

        // 1. الإجمالي قبل الخصم
        $totalHt = $quantity * $unitPrice;

        // 2. مبلغ الخصم
        $discountAmount = $totalHt * ($discountPercentage / 100);

        // 3. بعد الخصم
        $afterDiscount = $totalHt - $discountAmount;

        // 4. TVA
        $totalTva = $afterDiscount * ($tvaRate / 100);

        // 5. TTC
        $totalTtc = $afterDiscount + $totalTva;

        // تعيين القيم
        $line->total_ht = round($totalHt, 4);
        $line->discount_amount = round($discountAmount, 4);
        $line->total_tva = round($totalTva, 4);
        $line->total_ttc = round($totalTtc, 4);
    }
}
