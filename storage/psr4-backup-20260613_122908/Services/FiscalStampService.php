<?php
// app/Services/FiscalStampService.php

namespace App\Services;

use App\Models\FiscalStamp;
use App\Models\CommercialDocument;
use Carbon\Carbon;

class FiscalStampService
{
    /**
     * حساب الطابع الجبائي المنطبق على مستند تجاري
     */
    public function calculateStamp(CommercialDocument $document): array
    {
        $baseAmount = $document->total_ttc; // الأساس هو المبلغ شامل الضريبة

        $stamp = FiscalStamp::where('active', true)
            ->where('valid_from', '<=', $document->document_date)
            ->where(function ($q) use ($document) {
                $q->whereNull('valid_to')->orWhere('valid_to', '>=', $document->document_date);
            })
            ->where('min_amount', '<=', $baseAmount)
            ->where(function ($q) use ($baseAmount) {
                $q->whereNull('max_amount')->orWhere('max_amount', '>=', $baseAmount);
            })
            ->first();

        if (!$stamp) {
            return ['amount' => 0.0, 'stamp_id' => null];
        }

        $amount = $stamp->type === 'percentage'
            ? round($baseAmount * ($stamp->stamp_value / 100), 4)
            : $stamp->stamp_value;

        return ['amount' => $amount, 'stamp_id' => $stamp->id];
    }

    /**
     * تطبيق الطابع على المستند وإعادة حساب net_to_pay
     */
    public function applyStampToDocument(CommercialDocument $document): CommercialDocument
    {
        $stampData = $this->calculateStamp($document);

        $document->stamp_amount = $stampData['amount'];
        $document->fiscal_stamp_id = $stampData['stamp_id'];
        $document->net_to_pay = $document->total_ttc + $document->stamp_amount - $document->paid_amount;

        return $document;
    }
}
