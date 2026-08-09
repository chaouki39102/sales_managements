<?php

namespace App\Services\Payments\Gateway;

use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Str;

/**
 * MockGateway — مزوّد دفع تجريبي (وظيفي بالكامل) بلا حساب تاجر حقيقي.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * يحاكي تدفّق بوابة حقيقية:
 *   1. createPayment() يولّد مرجعاً (MOCK-XXXX) ويعيد URL صفحة دفع محلية
 *      (سيستضيفها MockGatewayController — صفحة HTML مستقلة عن الـ SPA).
 *   2. عند تأكيد/إلغاء الزبون، تُبنى حمولة موقّعة (HMAC-SHA256) بنفس بنية
 *      الإشعار الذي سيرسله مزوّد حقيقي، ويطبَّق عبر نفس مسار الـ webhook.
 *
 * ملاحظة: التوقيع هنا يخص النموذج (secret_key من الإعدادات) — الغرض منه
 * إثبات أن مسار التحقق/التطبيق يعمل بنفس القيود الأمنية لبوابة حقيقية
 * (رفض التوقيع المزوّر، مقارنة المبلغ مع النية، الحماية من إعادة اللعب).
 */
class MockGateway implements PaymentGateway
{
    public function __construct(
        protected readonly GatewayConfig $config,
    ) {}

    public function name(): string
    {
        // عند استبدال النموذج ببوابة حقيقية يحمل هذا المعرف اسم المزوّد الفعلي
        // (edahabia | cib | ctpay) فيُحفظ في portal_orders.payment_provider
        // ويبقى تاريخ النيات متسقاً مع المزوّد المستقبلي.
        return $this->config->provider;
    }

    public function isSandbox(): bool
    {
        return $this->config->mode !== 'live';
    }

    /**
     * يولّد نية دفع تجريبية. لا يتصل بأي خدمة خارجية.
     */
    public function createPayment(array $params): array
    {
        $reference = 'MOCK-' . strtoupper(Str::random(16));
        $amount    = round((float) ($params['amount'] ?? 0), 2);

        // توكن فتح صفحة الدفع — يثبت أن الطلب جاء عبر createPayment.
        $token = $this->sign(['reference' => $reference, 'amount' => $amount]);

        return [
            'reference'    => $reference,
            'redirect_url' => url('/portal-gateway/mock/' . $reference . '?token=' . urlencode($token)),
        ];
    }

    /**
     * يثبّت توقيع إشعار النموذج ويعيد الحالة المطبّعة.
     *
     * الحمولة الموقّعة (بنفس البنية التي سيبنيها MockGatewayController):
     *   reference, amount, status, transaction_id, ts
     */
    public function verifyNotification(array $payload, ?string $signature): array
    {
        $reference = (string) ($payload['reference'] ?? '');
        $amount    = (float) ($payload['amount'] ?? 0);
        $status    = (string) ($payload['status'] ?? 'pending');

        if ($reference === '') {
            throw new BusinessRuleException('حمولة إشعار الدفع غير مكتملة (reference مفقود).', 422);
        }

        $allowed = ['succeeded', 'failed', 'cancelled', 'pending'];
        if (!in_array($status, $allowed, true)) {
            throw new BusinessRuleException('حالة دفع غير معروفة من المزوّد.', 422);
        }

        $expected = $this->sign([
            'reference'      => $reference,
            'amount'         => $amount,
            'status'         => $status,
            'transaction_id' => $payload['transaction_id'] ?? '',
            'ts'             => $payload['ts'] ?? '',
        ]);

        if (!$signature || !hash_equals($expected, $signature)) {
            throw new BusinessRuleException('توقيع إشعار الدفع غير صالح.', 403);
        }

        return [
            'status'         => $status,
            'reference'      => $reference,
            'amount'         => $amount,
            'transaction_id' => $payload['transaction_id'] ?? null,
        ];
    }

    /**
     * يوقّع مصفوفة بمفتاح الشركة (HMAC-SHA256، مفتاح الإعدادات).
     * تُستخدم لنفس الحمولة الواحدة في تدفق النموذج.
     *
     * @param array $payload مصفوفة مسطّحة (قيم سكاalar)
     */
    public function sign(array $payload): string
    {
        ksort($payload);
        $canonical = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return hash_hmac('sha256', (string) $canonical, $this->config->secretKey ?: 'mock-secret');
    }
}
