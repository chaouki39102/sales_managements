<?php

namespace App\Services\Payments\Gateway;

use App\Core\Exceptions\BusinessRuleException;

/**
 * PaymentGateway — عقد مزوّد الدفع الإلكتروني لبوابة الزبائن.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * كل بوابة (Mock، EDAHABIA، CIB، CTPay...) تنفّذ هذا العقد. المنطق المحاسبي
 * (PaymentSynchronizer) لا يعرف أي مزوّد بعينه — فقط المرجع والمبلغ والحالة.
 *
 * تدفّق النموذج (مستقل عن المزوّد):
 *   1. createPayment()   → إنشاء نية دفع: تُخزَّن على portal_orders
 *                          (payment_intent_id/payment_amount/payment_status)
 *                          وتُعاد للمتجر URL توجيه الزبون إلى صفحة الدفع.
 *   2. (المزوّد يستضيف الصفحة) → إشعار webhook / عودة الزبون.
 *   3. verifyNotification() → تثبيت التوقيع وتطبيع الحالة قبل التطبيق المحاسبي.
 *
 * ملاحظة أمنية: لا يُسمح لأي حمولة بمراوغة المبلغ — المبلغ المحاسبي الحقيقي
 * يُقرأ من portal_orders (المحسوب في الخادم عند إنشاء الطلب)، والإشعار يطبَّق
 * فقط بعد التحقق من تطابق مبلغه مع النية المخزّنة (مبدأ amount-from-server).
 */
interface PaymentGateway
{
    /**
     * معرّف المزوّد (mock | edahabia | cib | ctpay ...) — يُخزَّن في
     * portal_orders.payment_provider ليتعرف النظام على مصدر كل نية.
     */
    public function name(): string;

    /**
     * وضع التشغيل (sandbox | live) — مصدره إعداد online_payment_mode.
     */
    public function isSandbox(): bool;

    /**
     * إنشاء نية دفع جديدة.
     *
     * @param array $params [
     *   'company_id'       => int,
     *   'order_id'         => int,
     *   'order_reference'  => string,   // مرجع طلب البوابة (إنساني للعرض)
     *   'amount'           => float,    // المبلغ المحسوب في الخادم (السلطة)
     *   'currency'         => string,   // 'DZD'
     *   'customer_name'    => string|null,
     *   'customer_phone'   => string|null,
     *   'customer_email'   => string|null,
     *   'return_url'       => string,   // يعود إليها الزبون بعد الدفع (لا تطبيق فيها)
     * ]
     *
     * @return array{
     *   reference: string,        // payment_intent_id — معرف فريد لدى المزوّد
     *   redirect_url: string      // URL صفحة الدفع (المزوّد أو نموذج محلي)
     * }
     *
     * @throws BusinessRuleException عند خطأ في التهيئة/الاتصال (تظهر للزبون برسالة عربية).
     */
    public function createPayment(array $params): array;

    /**
     * التحقق من إشعار (webhook / عودة الزبون) وتطبيعه.
     *
     * يجب أن يفشل (BusinessRuleException) عند أي توقيع غير صالح، وممنوع أن
     * يثق بأي حقل مالي غير موقّع.
     *
     * @param array  $payload   الحمولة المرسلة (مفاتيح مسطّحة)
     * @param string|null $signature التوقيع المرافق (اعتماداً على المزوّد)
     *
     * @return array{
     *   status: 'succeeded'|'failed'|'cancelled'|'pending',
     *   reference: string,            // payment_intent_id للنية المعنية
     *   amount: float,                // المبلغ كما أرسله المزوّد (يُقارن بالنوايا)
     *   transaction_id: string|null   // رقم العملية لدى المزوّد (إن وُجد)
     * }
     *
     * @throws BusinessRuleException عند توقيع غير صالح أو حمولة غير مكتملة.
     */
    public function verifyNotification(array $payload, ?string $signature): array;
}
