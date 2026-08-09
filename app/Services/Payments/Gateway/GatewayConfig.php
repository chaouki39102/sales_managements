<?php

namespace App\Services\Payments\Gateway;

/**
 * GatewayConfig — إعدادات مزوّد الدفع الجاهزة للبوابة (قيمة لا تتغير).
 * تُبنى من إعدادات الشركة (Setting::getSetting) عبر PaymentGatewayFactory.
 */
class GatewayConfig
{
    public function __construct(
        public readonly string $provider,
        public readonly string $mode,
        public readonly string $merchantId,
        public readonly string $secretKey,
    ) {}
}
