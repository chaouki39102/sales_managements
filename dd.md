

private function computeLineTotals(array $line): arrayprivate function computeLineTotals(array $line): array
{{
    $qty     = (float) ($line['quantity']            ?? 0);    $qty            = (float) ($line['quantity']                ?? 0);
    $price          = (float) ($line['unit_price_ht']           ?? 0);
    $price   = (float) ($line['unit_price_ht']       ?? 0);    $discPct        = (float) ($line['discount_percentage']     ?? 0);
    $discAmtPerUnit = (float) ($line['discount_amount_per_unit'] ?? 0);
    $discPct = (float) ($line['discount_percentage'] ?? 0);    $tvaRate        = (float) ($line['tva_rate']                ?? 0);

    $tvaRate = (float) ($line['tva_rate']            ?? 0);    $gross = $qty * $price;




    $gross    = $qty * $price;    if ($discAmtPerUnit > 0) {
    $discount = $gross * ($discPct / 100);        $discount = $discAmtPerUnit * $qty;
    $ht       = $gross - $discount;    } else {
    $tva      = $ht * ($tvaRate / 100);        $discount = $gross * ($discPct / 100);
    }

    $ht  = $gross - $discount;
    $tva = $ht * ($tvaRate / 100);

    return [
        'total_ht'              => round($ht,       4),
        'discount_amount'       => round($discAmtPerUnit > 0 ? $discAmtPerUnit : ($price * ($discPct / 100)), 4),
        'discount_amount_per_unit' => $discAmtPerUnit > 0 ? round($discAmtPerUnit, 4) : null,
        'total_discount_amount' => round($discount, 4),
    return [        'total_tva'             => round($tva,       4),
        'total_ht'        => round($ht,       2),        'total_ttc'             => round($ht + $tva, 4),
        'discount_amount' => round($discount,  2),    ];
}
        'total_tva'       => round($tva,       2),
// ═══════════════════════════════════════════════════════════════════════
        'total_ttc'       => round($ht + $tva, 2),


    ];
}

// ═══════════════════════════════════════════════════════════════════════
+ Thought: 205ms
Update the observer docblock:
← Edit app\Observers\CommercialDocumentLineObserver.php
/**/**
 * CommercialDocumentLineObserver * CommercialDocumentLineObserver
 * ══════════════════════════════════════════════════════════════════════════════ * ══════════════════════════════════════════════════════════════════════════════
 * *
 * المسؤولية: حساب إجماليات السطر عند الحفظ المباشر. * Responsible: compute line totals on save.
 * *
 * ══ نموذج الحساب (مطابق لـ CommercialDocumentService::computeLineTotals) ══ * ══ TWO MUTUALLY-EXCLUSIVE DISCOUNT PATHS ═══════════════════════════════════
 * *
 *   quantity         = وحدات أساسية (الفرونتند يُرسل displayQty × packQty) *  Path A — Native fixed-amount (discount_amount_per_unit > 0):
 *   unit_price_ht    = سعر الوحدة الأساسية *    discount_amount_per_unit = frozen per-unit DZD from quantity tier
 *    discount_percentage     = 0
 *   discount_percentage = نسبة الخصم % *    total_discount          = discount_amount_per_unit × quantity
 *   discount_amount  = مبلغ خصم الوحدة الواحدة = unit_price_ht × discPct/100 *    NO percentage conversion — ever.
 *                      (يُحسَب هنا ويُخزَّن — للمرجع) *
 * *  Path B — Percentage (discount_amount_per_unit is null):
 *   gross    = quantity × unit_price_ht *    discount_percentage = user-supplied or tier percentage
 *   discount = gross × discount_percentage / 100 *    total_discount      = gross × (discount_percentage / 100)
 *   total_ht = gross - discount *    discount_amount     = unit_price_ht × (discount_percentage / 100) — per-unit ref

 *   total_tva = total_ht × tva_rate / 100 *

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
 */ * ══════════════════════════════════════════════════════════════════════════════
class CommercialDocumentLineObserver */
{class CommercialDocumentLineObserver
{