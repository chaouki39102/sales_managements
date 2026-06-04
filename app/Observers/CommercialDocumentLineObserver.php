<?php
// app/Observers/CommercialDocumentLineObserver.php

namespace App\Observers;

use App\Models\CommercialDocumentLine;

/**
 * CommercialDocumentLineObserver
 *
 * المسؤولية: حساب إجماليات السطر عند التعديل المباشر
 *
 * ✅ يعمل بشكل صحيح عند: PATCH/PUT على سطر منفرد
 *
 * ⚠️ لماذا لا يكفي عند الإنشاء؟
 *    Eloquent::isDirty() يُرجع false عند create() الجديد
 *    لأنه يقارن بالقيم الأصلية — والنموذج الجديد ليس له قيم أصلية
 *    لذا CommercialDocumentService::createDocumentLines() تحسب
 *    الإجماليات مباشرة في data قبل create()
 *
 * ✅ لا تعارض: إذا أرسل Service قيماً محسوبة، يُرجع isDirty() false
 *    لأن القيم الجديدة = القيم المُرسَلة → لا إعادة حساب غير ضرورية
 */
class CommercialDocumentLineObserver
{
    public function saving(CommercialDocumentLine $line): void
    {
        // عند الإنشاء ($line->exists = false):
        //   isDirty() يُرجع false دائماً → لكننا نحسب لضمان الصحة
        //   في حالة استدعاء create() مباشرة بدون Service
        //
        // عند التحديث ($line->exists = true):
        //   نحسب فقط إذا تغيرت القيم الأساسية — تحسين للأداء
        if ($line->exists && !$line->isDirty(['quantity', 'unit_price_ht', 'discount_percentage', 'tva_rate'])) {
            return;
        }

        $this->calculateLineTotals($line);
    }

    private function calculateLineTotals(CommercialDocumentLine $line): void
    {
        $qty     = (float) ($line->quantity            ?? 0);
        $price   = (float) ($line->unit_price_ht       ?? 0);
        $discPct = (float) ($line->discount_percentage ?? 0);
        $tvaRate = (float) ($line->tva_rate            ?? 0);

        $gross          = $qty * $price;
        $discountAmount = $gross * ($discPct / 100);
        $ht             = $gross - $discountAmount;
        $tva            = $ht * ($tvaRate / 100);

        $line->total_ht        = round($ht,             4);
        $line->discount_amount = round($discountAmount, 4);
        $line->total_tva       = round($tva,             4);
        $line->total_ttc       = round($ht + $tva,       4);
    }
}
