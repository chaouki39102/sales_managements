<?php

namespace App\Services\Tax;

use App\Models\CommercialDocument;

class FiscalStampCalculator
{
    private const MIN_STAMP = 5.0;
    private const MAX_STAMP = 2500.0;
    private const RATE = 0.01;

    public function calculate(CommercialDocument $document): float
    {
        $amount = $document->total_ttc ?? $document->total_ht ?? 0;

        if ($amount <= 0) {
            return 0.0;
        }

        $calculated = $amount * self::RATE;

        $stamp = max(self::MIN_STAMP, min($calculated, self::MAX_STAMP));

        return round($stamp, 2);
    }

    public function calculateFromAmount(float $amount): float
    {
        if ($amount <= 0) {
            return 0.0;
        }

        $calculated = $amount * self::RATE;

        $stamp = max(self::MIN_STAMP, min($calculated, self::MAX_STAMP));

        return round($stamp, 2);
    }

    public static function getMinStamp(): float
    {
        return self::MIN_STAMP;
    }

    public static function getMaxStamp(): float
    {
        return self::MAX_STAMP;
    }

    public static function getRate(): float
    {
        return self::RATE;
    }
}