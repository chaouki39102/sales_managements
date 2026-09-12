<?php

namespace App\Http\Controllers\Api\V1\WhatsApp;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Http\Controllers\BaseApiController;
use App\Models\Setting;
use App\Services\CompanyContextService;
use App\Services\WhatsApp\WhatsAppWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * WhatsAppWebhookController — نقاط نهاية ويبهوك Meta WhatsApp Business.
 * ════════════════════════════════════════════════════════════════════════
 *  GET  /{company}/whatsapp/webhook      مصافحة التحقق (verify_token)
 *  POST /{company}/whatsapp/webhook      استلام الرسائل (HMAC في الوضع live)
 *  POST /{company}/whatsapp/mock-send    محاكاة إرسال رسالة (لوضع التطوير)
 *
 * قاعدة "الويبهوك يُجيب دائماً بـ 200": المتجر معالِج الرسائل للنشر غير
 * المتزامن، وكل نتيجة عمل (سواء نجح الطلب أو فشل في القراءة) تُسلَّم عبر
 * الحقل "error" برمز 200 حتى لا يعيد Meta المحاولة على أخطاء منطقية دائمة.
 */
class WhatsAppWebhookController extends BaseApiController
{
    protected string $resourceName = 'whatsapp_webhook';

    public function __construct(private readonly WhatsAppWebhookService $service)
    {
    }

    /**
     * مصافحة التحقق (GET) — Meta تتحقق من عنوان المتجر قبل تفعيل الويب‌هوك.
     */
    public function verify(Request $request): JsonResponse
    {
        // PHP يحوّل النقاط في أسماء معاملات GET إلى شرطات سفلية (hub.challenge
        // تصبح hub_challenge في $_GET)، لذا نقرأ كلا الشكلين — الشكل الذي يرسله
        // Meta فعلاً (نقاط) والشكل المتحوّل في PHP.
        $query     = $request->query();
        $mode      = (string) ($query['hub.mode'] ?? $query['hub_mode'] ?? '');
        $token     = (string) ($query['hub.verify_token'] ?? $query['hub_verify_token'] ?? '');
        $challenge = $query['hub.challenge'] ?? $query['hub_challenge'] ?? null;

        $expected = (string) Setting::getSetting('whatsapp_verify_token', '');

        if ($mode === 'subscribe' && $expected !== '' && hash_equals($expected, $token) && $challenge !== null) {
            return response()->json($challenge);
        }

        return response()->json(['error' => 'verification failed'], 403);
    }

    /**
     * استقبال الرسائل (POST).
     */
    public function message(Request $request): JsonResponse
    {
        $companyId = (int) app(CompanyContextService::class)->get();
        $raw       = (string) $request->getContent();

        if ((string) Setting::getSetting('whatsapp_mode', 'mock', $companyId) === 'live') {
            $signature = (string) $request->header('X-Hub-Signature-256');
            $expected  = 'sha256=' . hash_hmac(
                'sha256',
                $raw,
                (string) Setting::getSetting('whatsapp_app_secret', '', $companyId)
            );

            if ($signature === '' || ! hash_equals($expected, $signature)) {
                return response()->json(['status' => 'processed', 'ok' => false, 'error' => 'invalid signature'], 403);
            }
        }

        $payload = json_decode($raw, true);

        if (! is_array($payload) || empty($payload)) {
            return response()->json(['status' => 'processed', 'ok' => false, 'error' => 'invalid_json']);
        }

        try {
            $result = $this->service->process($payload, $companyId);
        } catch (BusinessRuleException $e) {
            return response()->json([
                'status' => 'processed',
                'ok'     => false,
                'error'  => $e->getUserMessage(),
            ]);
        } catch (\Throwable $e) {
            Log::error('WHATSAPP_WEBHOOK_ERROR', [
                'company_id' => $companyId,
                'message'    => $e->getMessage(),
                'trace'      => substr($e->getTraceAsString(), 0, 2000),
            ]);

            return response()->json([
                'status' => 'processed',
                'ok'     => false,
                'error'  => 'internal_error',
            ]);
        }

        return response()->json([
            'status'          => 'processed',
            'ok'              => $result['ok'] ?? false,
            'skipped'         => $result['skipped'] ?? false,
            'reason'          => $result['reason'] ?? null,
            'order_reference' => $result['order_reference'] ?? null,
            'reply'           => $result['reply'] ?? null,
            'error'           => $result['error'] ?? null,
            'sent'            => $result['sent'] ?? null,
            'info'            => $result['info'] ?? null,
            'received'        => now()->toIso8601String(),
        ]);
    }

    /**
     * محاكاة إرسال (تطوير): يبني payload تركيبياً ويشغّل نفس العملية.
     */
    public function mockSend(Request $request): JsonResponse
    {
        $companyId = (int) app(CompanyContextService::class)->get();

        if (! (bool) Setting::getSetting('whatsapp_enabled', false, $companyId)) {
            throw new BusinessRuleException('الرد التلقائي على رسائل واتساب غير مفعّل.', 422);
        }

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'text'  => ['required', 'string', 'max:3000'],
            'name'  => ['nullable', 'string', 'max:100'],
        ]);

        $phone = $validated['phone'];
        $text  = $validated['text'];

        $payload = [
            'object' => 'whatsapp_business_account',
            'entry'  => [
                [
                    'id'      => 'mock',
                    'changes' => [
                        [
                            'value' => [
                                'messaging_product' => 'whatsapp',
                                'messages'          => [
                                    [
                                        'from'  => $phone,
                                        'type'  => 'text',
                                        'text'  => ['body' => $text],
                                    ],
                                ],
                                'contacts'          => [
                                    [
                                        'wa_id'   => $phone,
                                        'profile' => ['name' => $validated['name'] ?? null],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $result = $this->service->process($payload, $companyId);

        return $this->successResponse($result, 'تمت معالجة طلب واتساب بنجاح.');
    }
}