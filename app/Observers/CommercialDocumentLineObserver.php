<?php
// app/Observers/CommercialDocumentLineObserver.php

namespace App\Observers;

use App\Models\CommercialDocumentLine;

/**
 * CommercialDocumentLineObserver
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * المسؤولية: حساب إجماليات السطر عند الحفظ المباشر.
 *
 * ══ نموذج الحساب (مطابق لـ CommercialDocumentService::computeLineTotals) ══
 *
 *   quantity         = وحدات أساسية (الفرونتند يُرسل displayQty × packQty)
 *   unit_price_ht    = سعر الوحدة الأساسية
 *   discount_percentage = نسبة الخصم %
 *   discount_amount  = مبلغ خصم الوحدة الواحدة = unit_price_ht × discPct/100
 *                      (يُحسَب هنا ويُخزَّن — للمرجع)
 *
 *   gross    = quantity × unit_price_ht
 *   discount = gross × discount_percentage / 100
 *   total_ht = gross - discount
 *   total_tva = total_ht × tva_rate / 100
 *   total_ttc = total_ht + total_tva
 *
 * ══ الأولوية ═════════════════════════════════════════════════════════════════
 *
 *  1. discount_percentage (الأساسي — يُحسَب الباقي منه)
 *  2. discount_amount (للمرجع — يُحسَب من discPct)
 *
 *  ⚠️ إذا أرسل الفرونتند discount_amount بدون discount_percentage
 *     (وضع fixed)، نحسب discPct = (discount_amount / unit_price_ht) × 100
 *     ثم نعيد حساب discount_amount بالمنطق الموحَّد.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class CommercialDocumentLineObserver
{
    public function saving(CommercialDocumentLine $line): void
    {
        // عند التحديث: لا نعيد الحساب إلا إذا تغيرت القيم الأساسية
        if ($line->exists && !$line->isDirty([
            'quantity',
            'unit_price_ht',
            'discount_percentage',
            'discount_amount',
            'tva_rate',
        ])) {
            return;
        }

        $this->calculateLineTotals($line);
    }

    private function calculateLineTotals(CommercialDocumentLine $line): void
    {
        $qty      = (float) ($line->quantity        ?? 0);
        $price    = (float) ($line->unit_price_ht   ?? 0);
        $tvaRate  = (float) ($line->tva_rate        ?? 0);

        $discPct    = (float) ($line->discount_percentage ?? 0);
        $discAmount = (float) ($line->discount_amount     ?? 0);

        // discount_amount (per-unit) is the source of truth for fixed discounts.
        // When provided, derive discount_percentage from it — this preserves the
        // exact fixed DZD value the user entered, even if compounding changed the percentage.
        if ($discAmount > 0 && $price > 0) {
            $discPct = ($discAmount / $price) * 100;
        }

        $gross          = $qty * $price;
        $discountTotal  = $gross * ($discPct / 100);
        $ht             = $gross - $discountTotal;
        $tva            = $ht * ($tvaRate / 100);

        // discount_amount = خصم الوحدة الواحدة (للمرجع)
        $unitDiscountAmount = $price * ($discPct / 100);

        $line->discount_percentage  = round($discPct,             4);
        $line->discount_amount      = round($unitDiscountAmount,   4);
        $line->total_ht             = round($ht,                  4);
        $line->total_tva            = round($tva,                  4);
        $line->total_ttc            = round($ht + $tva,            4);

        // total_discount_amount = إجمالي الخصم على الوحدات كلها (للعرض)
        $line->total_discount_amount = round($discountTotal, 4);
    }
}
