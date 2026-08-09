<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Http\Controllers\BaseApiController;
use App\Models\PortalOrder;
use App\Services\CompanyContextService;
use App\Services\Payments\Gateway\PaymentGatewayFactory;
use App\Services\Portal\PortalOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PortalPaymentWebhookController — إشعار مزوّد الدفع الإلكتروني لطلبات البوابة.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * نقطة استقبال تعتمد على التوقيع فقط (لا portal.auth — البوابة/النموذج المحلي
 * يتصل مباشرة). مسار عام خارج portal.auth لكن ضمن سياق المؤسسة
 * ({company}/portal) حتى يُحل المزوّد حسب إعدادات المؤسسة.
 *
 * سلسلة الأمان (بالترتيب):
 *   1. verifyNotification() → التوقيع (HMAC) — أي حمولة مزوّرة تُرفض 403.
 *   2. amount-from-server   → مبلغ الإشعار يجب أن يطابق payment_amount المخزّن
 *                             على الطلب (المحسوب في الخادم عند الإنشاء).
 *   3. نافذة زمنية (ts)     → إشعار أقدم من ساعة يُرفض (يوقف إعادة اللعب القديمة).
 *   4. settlePayment()      → حماية إعادة اللعب (حالة نهائية + معرّف العملية)
 *                             وتسجيل الحالة + التاريخ المكتوب.
 *
 * لا تُنشأ دفعة محاسبية هنا — الدفعة (ONL) تُسلَّم إلى الفاتورة عند تحويل
 * الطلب (PortalOrderService::convertToSale → onlinePaymentPayload) عبر
 * PaymentSynchronizer، فلا تتضاعف الدفعات أبداً.
 */
class PortalPaymentWebhookController extends BaseApiController
{
    protected string $resourceName = 'portal_order';

    /** النافذة الزمنية المسموحة للإشعار (ثوانٍ) حول لحظة إرساله. */
    protected const NOTIFICATION_TTL_SECONDS = 3600;

    /** سماحية مقارنة مبلغ الإشعار مع النية (دج). */
    protected const AMOUNT_TOLERANCE = 0.01;

    public function __construct(
        private readonly PortalOrderService $orders,
    ) {
        parent::__construct();
    }

    public function __invoke(Request $request): JsonResponse
    {
        try {
            $companyId = (int) app(CompanyContextService::class)->get();
            if (!$companyId) {
                throw new BusinessRuleException('لم يتم تحديد المؤسسة.', 422);
            }

            $gateway = PaymentGatewayFactory::resolve($companyId);

            $payload = $request->only(['reference', 'amount', 'status', 'transaction_id', 'ts']);
            $signature = $request->input('signature');

            // 1) التوقيع أولاً — أي توقيع غير صالح يوقف المعالجة هنا.
            $verified = $gateway->verifyNotification($payload, $signature);

            $order = PortalOrder::query()
                ->where('company_id', $companyId)
                ->where('payment_intent_id', $verified['reference'])
                ->first();

            if (!$order) {
                throw new BusinessRuleException('لا توجد نية دفع بهذا المرجع.', 404);
            }

            // 2) المبلغ المحاسبي من الخادم حصراً — لا يُقبل إشعار يخالف النية.
            if (abs((float) $verified['amount'] - (float) $order->payment_amount) > self::AMOUNT_TOLERANCE) {
                throw new BusinessRuleException('مبلغ إشعار الدفع لا يطابق قيمة الطلب.', 422);
            }

            // 3) نافذة زمنية — إشعار أقدم من ساعة يُرفض (إعادة لعب قديمة).
            $ts = (int) ($payload['ts'] ?? 0);
            if ($ts > 0 && abs(time() - $ts) > self::NOTIFICATION_TTL_SECONDS) {
                throw new BusinessRuleException('إشعار الدفع منتهي الصلاحية.', 422);
            }

            // 4) التطبيق (idempotent داخل settlePayment).
            $order = $this->orders->settlePayment($order, $verified);

            return $this->successResponse(
                $this->orders->toArray($order, PortalOrder::CHANGED_BY_ADMIN),
                'تم استلام إشعار الدفع بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_orders.payment_webhook');
        }
    }
}
