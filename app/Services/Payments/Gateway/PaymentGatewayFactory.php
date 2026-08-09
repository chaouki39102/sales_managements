<?php

namespace App\Services\Payments\Gateway;

use App\Models\Setting;

/**
 * PaymentGatewayFactory — محلّل المزوّد وفق إعدادات الشركة.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * المفتاح online_payment_provider يحدد أي بوابة تُستخدم (mock | edahabia |
 * cib | ctpay...). إضافة مزوّد جديد = تنفيذ PaymentGateway وإضافته هنا فقط —
 * لا تتغير أي نقطة استهلاك (الخدمات/الوحدات التحكمية تقرأ النية عبر الواجهة).
 */
class PaymentGatewayFactory
{
    public static function resolve(int $companyId): PaymentGateway
    {
        $provider = (string) Setting::getSetting('online_payment_provider', 'mock', $companyId);

        $config = new GatewayConfig(
            provider:   $provider,
            mode:       (string) Setting::getSetting('online_payment_mode', 'sandbox', $companyId),
            merchantId: (string) Setting::getSetting('online_payment_merchant_id', '', $companyId),
            secretKey:  (string) Setting::getSetting('online_payment_secret_key', '', $companyId),
        );

        return match ($provider) {
            'mock'       => new MockGateway($config),
            'edahabia'   => new MockGateway($config),
            'cib'        => new MockGateway($config),
            'ctpay'      => new MockGateway($config),
            default      => new MockGateway($config),
        };
    }
}
