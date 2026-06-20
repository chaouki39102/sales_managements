<?php

namespace App\Services\Tax;

use App\Models\Party;
use App\Models\Product;

class TaxRuleService
{
    /**
     * Return the effective TVA rate for a (party × product) combination.
     *
     * @return array{rate: float, reason: string|null, forced: bool}
     */
    public function getEffectiveTvaRate(?Party $party, ?Product $product): array
    {
        $rate   = 0.0;
        $reason = null;
        $forced = false;

        // No product → 0
        if (!$product) {
            return ['rate' => 0.0, 'reason' => 'no_product', 'forced' => true];
        }

        // 1. Party is TVA exempt → force 0
        if ($party && $party->is_tva_exempt) {
            return ['rate' => 0.0, 'reason' => 'party_exempt', 'forced' => true];
        }

        // 2. Party is final consumer → use product TVA (standard rate applies to consumer)
        if ($party && $party->is_final_consumer) {
            $rate = (float) ($product->tva?->rate ?? 0);
            return ['rate' => $rate, 'reason' => 'final_consumer', 'forced' => false];
        }

        // 3. Default: use product's assigned TVA rate
        $rate = (float) ($product->tva?->rate ?? 0);

        // 4. Check tax regime
        if ($party && $party->tax_regime === 'forfaitaire') {
            // Forfaitaire regime: specific TVA rules could apply
            // For now, keep product TVA rate
            $reason = 'forfaitaire';
        }

        return ['rate' => $rate, 'reason' => $reason, 'forced' => false];
    }

    /**
     * Quick check: should TVA input be read-only on the frontend?
     */
    public function isTvaLocked(?Party $party): bool
    {
        return $party && ($party->is_tva_exempt || $party->is_final_consumer);
    }
}
