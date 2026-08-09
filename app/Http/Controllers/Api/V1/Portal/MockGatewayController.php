<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\PortalOrder;
use App\Services\CompanyContextService;
use App\Services\Payments\Gateway\PaymentGatewayFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;

/**
 * MockGatewayController — صفحة دفع النموذج (المزوّد التجريبي).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * مسارات ويب مستقلة عن الـ SPA (تستضيفها MockGateway::createPayment عبر
 * redirect_url). عند استبدال النموذج ببوابة حقيقية، تُحذف هذه الصفحة ويستضيف
 * المزوّد صفحته الخاصة — لا يتغير أي شيء في مسار التطبيق (webhook).
 *
 * التدفّق:
 *   1. GET  /portal-gateway/mock/{reference}?token=…  → صفحة الدفع (تُثبّت
 *      التوكن الذي وُلّد في createPayment ثم تعرض ملخص الطلب + زرّي تأكيد/إلغاء).
 *   2. POST /portal-gateway/mock/{reference}/confirm  → حمولة موقّعة
 *      (reference, amount, status=succeeded, transaction_id, ts) تُرسَل إلى
 *      webhook التطبيق، ثم يُعاد الزبون إلى return_url.
 *   3. POST /portal-gateway/mock/{reference}/cancel   → حمولة موقّعة
 *      (status=cancelled) إلى webhook، ثم يُعاد إلى cancel_url.
 *
 * الحمولة الموقّعة هنا هي بالضبط ما سيرسله مزوّد حقيقي، ويمر عبر نفس
 * قيود webhook (توقيع → مبلغ من الخادم → نافذة زمنية → حماية إعادة اللعب).
 */
class MockGatewayController
{
    /**
     * صفحة الدفع — تُعرض للزبون داخل إطار المتصفح مباشرة.
     */
    public function paymentPage(string $reference, Request $request): View|RedirectResponse
    {
        $order = PortalOrder::where('payment_intent_id', $reference)->first();

        if (!$order) {
            return $this->leave($order, null, 'لا توجد عملية دفع بهذا المرجع.');
        }

        $gateway = PaymentGatewayFactory::resolve((int) $order->company_id);
        $amount  = round((float) $order->payment_amount, 2);
        $token   = (string) $request->query('token', '');

        // التوكن يثبت أن الزائر وصل عبر createPayment (لم يُختلق الرابط).
        $expected = $gateway->sign(['reference' => $reference, 'amount' => $amount]);
        if (!$token || !hash_equals($expected, $token)) {
            return $this->leave($order, null, 'رابط الدفع غير صالح أو منتهي الصلاحية.');
        }

        // الحالة النهائية (مدفوعة) → لا صفحة، عودة مباشرة للبوابة.
        if ($order->payment_status === PortalOrder::PAYMENT_SUCCEEDED) {
            return $this->leave($order, 'succeeded', null);
        }

        // طلب ملغى/مرتجع أو محوَّل → لا يمكن الدفع.
        if (in_array($order->status, PortalOrder::TERMINAL_STATUSES, true) || $order->is_converted) {
            return $this->leave($order, null, 'هذا الطلب لم يعد يقبل الدفع.');
        }

        $details = is_array($order->payment_details) ? $order->payment_details : [];

        return view('portal.mock-payment', [
            'order'       => $order,
            'company'     => $order->company,
            'amount'      => $amount,
            'customer'    => $order->party?->name ?? $order->customer_name,
            'provider'    => (string) ($order->payment_provider ?: 'mock'),
            'sandbox'     => $gateway->isSandbox(),
            'confirm_url' => url('/portal-gateway/mock/' . $reference . '/confirm'),
            'cancel_url'  => url('/portal-gateway/mock/' . $reference . '/cancel'),
            'back_url'    => (string) ($details['cancel_url'] ?? url('/')),
        ]);
    }

    /**
     * تأكيد الدفع — يبني إشعار «نجاح» موقّعاً ويرسله إلى webhook التطبيق.
     */
    public function confirm(string $reference): RedirectResponse
    {
        $order = PortalOrder::where('payment_intent_id', $reference)->first();

        if (!$order) {
            return $this->leave($order, null, 'لا توجد عملية دفع بهذا المرجع.');
        }

        if ($order->payment_status === PortalOrder::PAYMENT_SUCCEEDED) {
            return $this->leave($order, 'succeeded', null);
        }

        if (in_array($order->status, PortalOrder::TERMINAL_STATUSES, true) || $order->is_converted) {
            return $this->leave($order, null, 'هذا الطلب لم يعد يقبل الدفع.');
        }

        $gateway   = PaymentGatewayFactory::resolve((int) $order->company_id);
        $amount    = round((float) $order->payment_amount, 2);
        $ts        = time();
        $transactionId = 'MOCKTXN-' . strtoupper(Str::random(12));

        $payload = [
            'reference'      => $reference,
            'amount'         => $amount,
            'status'         => PortalOrder::PAYMENT_SUCCEEDED,
            'transaction_id' => $transactionId,
            'ts'             => $ts,
        ];
        $payload['signature'] = $gateway->sign($payload);

        // نُرسل الحمولة إلى webhook التطبيق عبر إرسال داخلي (في نفس العملية)
        // بدلاً من طلب HTTP ذاتي — php artisan serve أحادي الخيط وطلب HTTP
        // يعود إلى نفس الخادم يعلّق حتى المهلة. المسار الذي يُشغَّل هو نفسه
        // المسار العام (توقيع → مبلغ من الخادم → نافذة زمنية → تسوية).
        $result = $this->dispatchToWebhook($order, $payload) ? 'succeeded' : 'failed';

        return $this->leave($order, $result, $result === 'failed' ? 'تعذر تأكيد الدفع — جرّب مجدداً أو تواصل معنا.' : null);
    }

    /**
     * إلغاء الدفع — يرسل إشعار «إلغاء» موقّعاً ويعيد الزبون إلى المتجر.
     */
    public function cancel(string $reference): RedirectResponse
    {
        $order = PortalOrder::where('payment_intent_id', $reference)->first();

        if (!$order) {
            return $this->leave($order, null, 'لا توجد عملية دفع بهذا المرجع.');
        }

        if ($order->payment_status === PortalOrder::PAYMENT_SUCCEEDED) {
            return $this->leave($order, 'succeeded', null);
        }

        $gateway = PaymentGatewayFactory::resolve((int) $order->company_id);
        $amount  = round((float) $order->payment_amount, 2);
        $ts      = time();

        $payload = [
            'reference'      => $reference,
            'amount'         => $amount,
            'status'         => PortalOrder::PAYMENT_CANCELLED,
            // راجع MockGateway::verifyNotification — يعيد التوقيع على
            // transaction_id ?? '' فإرسال null هنا يكسر التطابق (null != '').
            'transaction_id' => '',
            'ts'             => $ts,
        ];
        $payload['signature'] = $gateway->sign($payload);

        $this->dispatchToWebhook($order, $payload);

        return $this->leave($order, 'cancelled', null);
    }

    /**
     * إرسال حمولة إشعار (بالتوقيع) إلى webhook التطبيق داخل نفس العملية.
     * يعيد true إذا استجاب webhook بالنجاح (200/201).
     */
    private function dispatchToWebhook(PortalOrder $order, array $payload): bool
    {
        try {
            // سياق الشركة: webhook يعتمد على CompanyContextService::get().
            app(CompanyContextService::class)->set((int) $order->company_id);

            $slug = $order->company?->slug ?: (string) $order->company_id;
            $request = Request::create(
                '/api/v1/' . $slug . '/portal/payment/webhook',
                'POST',
                $payload
            );

            $response = app(PortalPaymentWebhookController::class)($request);

            return $response->getStatusCode() >= 200 && $response->getStatusCode() < 300;
        } catch (BusinessRuleException) {
            return false;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * العودة إلى البوابة: redirect إلى return_url/cancel_url المخزّن مع
     * pay_result. عندما لا يوجد طلب (أو لا URLs) يعود للصفحة الرئيسية.
     */
    private function leave(?PortalOrder $order, ?string $payResult, ?string $error): RedirectResponse
    {
        if (!$order) {
            return redirect()->away(url('/'));
        }

        $details = is_array($order->payment_details) ? $order->payment_details : [];
        $url = $payResult === 'succeeded' || $payResult === 'cancelled'
            ? (string) ($details[$payResult === 'succeeded' ? 'return_url' : 'cancel_url'] ?? url('/'))
            : (string) ($details['cancel_url'] ?? url('/'));

        // rebuild clean — stored URLs may already carry order_id/pay_result
        $query = [
            'order_id' => $order->id,
        ];
        if ($payResult) {
            $query['pay_result'] = $payResult;
        }
        if ($error) {
            $query['pay_error'] = $error;
        }

        $url = strtok($url, '?') . '?' . http_build_query($query);

        return redirect()->away($url);
    }
}
