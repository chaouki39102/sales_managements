<?php
// app/Observers/CommercialDocumentLineObserver.php

namespace App\Observers;

use App\Models\CommercialDocumentLine;

/**
 * CommercialDocumentLineObserver
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Responsible: compute line totals on save.
 *
 * ══ TWO MUTUALLY-EXCLUSIVE DISCOUNT PATHS ═══════════════════════════════════
 *
 *  Path A — Native fixed-amount (discount_amount_per_unit > 0):
 *    discount_amount_per_unit = frozen per-unit DZD from quantity tier
 *    discount_percentage     = 0
 *    total_discount          = discount_amount_per_unit × quantity
 *    NO percentage conversion — ever.
 *
 *  Path B — Percentage (discount_amount_per_unit is null):
 *    discount_percentage = user-supplied or tier percentage
 *    total_discount      = gross × (discount_percentage / 100)
 *    discount_amount     = unit_price_ht × (discount_percentage / 100) — per-unit ref
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
            'discount_amount_per_unit',
            'discount_amount',
            'tva_rate',
        ])) {
            return;
        }

        $this->calculateLineTotals($line);
    }

    private function calculateLineTotals(CommercialDocumentLine $line): void
    {
        $qty     = (float) ($line->quantity              ?? 0);
        $price   = (float) ($line->unit_price_ht          ?? 0);
        $tvaRate = (float) ($line->tva_rate               ?? 0);

        $discAmtPerUnit = (float) ($line->discount_amount_per_unit ?? 0);
        $discPct        = (float) ($line->discount_percentage     ?? 0);

        $gross = $qty * $price;

        // Native fixed-amount path: discount_amount_per_unit is per-BASE-UNIT from a
        // quantity tier. Multiply by baseQty (qty × packQty), NOT just qty.
        if ($discAmtPerUnit > 0) {
            $packQty = (float) ($line->packaging_units_snapshot ?? 1);
            $baseQty = $qty * $packQty;
            $discountTotal = $discAmtPerUnit * $baseQty;
            $unitDiscount  = $discAmtPerUnit;
        } else {
            $discountTotal = $gross * ($discPct / 100);
            $unitDiscount  = $price * ($discPct / 100);
        }

        $ht  = $gross - $discountTotal;
        $tva = $ht * ($tvaRate / 100);

        $line->discount_amount_per_unit = $discAmtPerUnit > 0 ? round($discAmtPerUnit, 4) : null;
        $line->discount_percentage      = round($discPct, 4);
        $line->discount_amount          = round($unitDiscount, 4);
        $line->total_ht                 = round($ht, 4);
        $line->total_tva                = round($tva, 4);
        $line->total_ttc                = round($ht + $tva, 4);
        $line->total_discount_amount    = round($discountTotal, 4);
    }
}
