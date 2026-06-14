<?php

namespace App\Services\Tax;

use App\Models\CommercialDocument;

class TAPCalculator
{
    private const RATES = [
        'commerce' => 0.02,
        'industry' => 0.01,
        'services' => 0.015,
        'liberal' => 0.025,
    ];

    private const DEFAULT_RATE = 0.015;

    public function calculate(CommercialDocument $document, string $activityType = 'commerce'): float
    {
        $amount = $document->total_ht ?? 0;

        if ($amount <= 0) {
            return 0.0;
        }

        $rate = self::RATES[$activityType] ?? self::DEFAULT_RATE;

        return round($amount * $rate, 2);
    }

    public function calculateFromAmount(float $amount, string $activityType = 'commerce'): float
    {
        if ($amount <= 0) {
            return 0.0;
        }

        $rate = self::RATES[$activityType] ?? self::DEFAULT_RATE;

        return round($amount * $rate, 2);
    }

    public static function getRates(): array
    {
        return self::RATES;
    }

    public static function getDefaultRate(): float
    {
        return self::DEFAULT_RATE;
    }
}