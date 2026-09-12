<?php

namespace App\Services\WhatsApp;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\Party;
use App\Models\PartyType;
use App\Models\Product;
use App\Models\Setting;
use App\Services\CompanyContextService;
use App\Services\Portal\PortalOrderService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * WhatsAppWebhookService — معالجة طلب واتساب واصل والتجاوب معه.
 * ════════════════════════════════════════════════════════════════════════
 * pipeline:
 *   payload → أول رسالة نصية → تطبيع الهاتف → اسم المرسل (من contacts)
 *   → مطابقة/إنشاء الزبون → تحميل المنتجات النشطة → تحليل النص إلى أسطر
 *   → إنشاء طلب بوابة (CMD) → رد عربي بالأسطر + الرقم + رابط التتبع → إرسال.
 *
 * الإرسال: mock (افتراضي، يسجّل عبر Log) أو live (Meta Graph API /messages).
 * الكمية/السعر في الرد: كمية الوحدات × unit_price_ht (سعر العبوة/الوحدة
 * كما يُخزَّن — لا نضرب في packaging_units_snapshot ثانيةً).
 */
class WhatsAppWebhookService
{
    public function __construct(
        private readonly PortalOrderService $portalOrders,
        private readonly WhatsAppInboundParser $parser,
        private readonly CompanyContextService $companyContext,
    ) {
    }

    /**
     * معالجة payload كامل لرسائل واتساب.
     *
     * @param  array  $payload  محتوى JSON الخام للويبهوك.
     * @return array<string, mixed>
     */
    public function process(array $payload, int $companyId): array
    {
        $company = Company::find($companyId);
        if (! $company || $company->deleted_at) {
            return ['ok' => false, 'error' => 'company_not_found'];
        }

        $enabled = (bool) Setting::getSetting('whatsapp_enabled', false, $companyId);
        if (! $enabled) {
            return ['ok' => true, 'skipped' => true, 'reason' => 'disabled'];
        }

        $message = $this->firstTextMessage($payload);
        if ($message === null) {
            return ['ok' => true, 'skipped' => true, 'reason' => 'no_text'];
        }

        $from             = $this->normalizePhone((string) ($message['from'] ?? ''));
        $profileName      = $this->profileName($payload, $message['from'] ?? '');
        $text             = trim((string) ($message['text']['body'] ?? ''));

        if ($from === '' || $text === '') {
            return ['ok' => true, 'skipped' => true, 'reason' => 'no_text'];
        }

        // كل الاستعلامات اللاحقة (زبون/منتجات/سلسلة ترقيم/إعدادات) تحتاج السياق.
        $this->companyContext->set($companyId);

        try {
            $party = $this->matchOrCreateParty($company, $from, $profileName);

            $products = Product::query()
                ->where('company_id', $companyId)
                ->where('active', true)
                ->get(['id', 'name', 'ref', 'barcode']);

            $lines = $this->parser->parse($text, $products);

            $order = $this->portalOrders->create([
                'lines'          => $lines,
                'customer_name'  => $profileName ?: null,
                'customer_phone' => $from,
                'notes'          => 'طلب واتساب من ' . $from,
            ], $party->id);
        } catch (BusinessRuleException $e) {
            return [
                'ok'      => false,
                'error'   => $e->getUserMessage(),
                'phone'   => $from,
            ];
        }

        $reply = $this->buildReply($order->reference, $order->total_ttc, $lines, $order->document?->lines);
        $sent  = $this->send($company, $from, $reply);

        return [
            'ok'              => true,
            'skipped'         => false,
            'order_reference' => $order->reference,
            'reply'           => $reply,
            'phone'           => $from,
            'sent'            => $sent['sent'],
            'info'            => $sent['info'],
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // استخراج الرسالة / المرسل
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @return array|null  أول رسالة نصية (text.body غير فارغ) ضمن entry[].changes[].value.
     */
    private function firstTextMessage(array $payload): ?array
    {
        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value    = $change['value'] ?? [];
                $messages = $value['messages'] ?? [];
                foreach ($messages as $message) {
                    if (($message['type'] ?? '') === 'text') {
                        $body = (string) ($message['text']['body'] ?? '');
                        if (trim($body) !== '') {
                            return $message;
                        }
                    }
                }
            }
        }

        return null;
    }

    private function profileName(array $payload, string $from): string
    {
        $from = $this->normalizePhone($from);

        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                foreach (($change['value']['contacts'] ?? []) as $contact) {
                    if ($this->normalizePhone((string) ($contact['wa_id'] ?? '')) === $from) {
                        $name = trim((string) ($contact['profile']['name'] ?? ''));
                        if ($name !== '') {
                            return $name;
                        }
                    }
                }
            }
        }

        return '';
    }

    /**
     * تطبيع رقم هاتف واتساب: تجاهل كل ما ليس رقماً، ثم إسقاط بادئة "00" فقط.
     * يُحتفظ بصفر البداية الواحد كما ورد من Meta (wa_id) — متّسق مع معالجة
     * matchOrCreateParty التي تقتطع "00" بنفس الشرط.
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if ($digits === null || $digits === '') {
            return '';
        }

        return '00' === substr($digits, 0, 2) ? substr($digits, 2) : $digits;
    }

    // ═══════════════════════════════════════════════════════════════════
    // الزبون
    // ═══════════════════════════════════════════════════════════════════

    private function matchOrCreateParty(Company $company, string $from, string $profileName): Party
    {
        $phone  = '00' === substr($from, 0, 2) ? substr($from, 2) : $from;
        $last9  = substr($phone, -9);

        $party = Party::query()
            ->where('company_id', $company->id)
            ->where(function ($q) use ($from, $last9) {
                $q->where('phone', $from)
                    ->orWhere('mobile', $from)
                    ->orWhere('phone', $last9)
                    ->orWhere('mobile', $last9);
            })
            ->whereNull('deleted_at')
            ->first();

        if ($party) {
            return $party;
        }

        $clientTypeId = PartyType::query()
            ->where('company_id', $company->id)
            ->where('name', 'client')
            ->value('id');

        /** @var Party $party */
        $party = Party::create([
            'company_id'           => $company->id,
            'party_type_id'        => $clientTypeId, // قابل للـ null إن لم يُهيّأ نوع "client"
            'code'                 => 'WA' . $last9,
            'name'                 => $profileName ?: ('زبون واتساب ' . $last9),
            'phone'                => $from,
            'mobile'               => null,
            'email'                => null,
            'address'              => null,
            'is_final_consumer'    => true,
            'is_tva_exempt'        => false,
            'portal_orders_enabled' => true,
            'active'               => true,
        ]);

        return $party;
    }

    // ═══════════════════════════════════════════════════════════════════
    // الرد
    // ═══════════════════════════════════════════════════════════════════

    private function buildReply(string $reference, string $totalTtc, array $lines, iterable $documentLines): string
    {
        $reply  = 'تم استلام طلبك بنجاح ✅' . "\n";
        $reply .= 'رقم الطلب: ' . $reference . "\n";

        $index = 1;
        foreach ($documentLines as $line) {
            $productName = (string) ($line->product?->name ?? $line->description ?? 'منتج');
            $qty         = (float) $line->quantity;
            $price       = (float) $line->unit_price_ht; // سعر العبوة/الوحدة المخزّن
            $reply       .= $index . '. ' . $productName . ' — ' . $this->formatQty($qty) . ' × ' . number_format($price, 2) . ' دج' . "\n";
            $index++;
        }

        $reply .= 'المجموع: ' . number_format((float) $totalTtc, 2) . ' دج';

        return trim($reply);
    }

    private function formatQty(float $qty): string
    {
        if ($qty == floor($qty)) {
            return (string) (int) $qty;
        }

        return rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.');
    }

    /**
     * رابط تتبع الطلب (صفحة طلب الزبون العامة).
     */
    public function trackingUrl(Company $company): string
    {
        $slug = $company->portal_slug ?: $company->slug;

        return rtrim(url('/'), '/') . '/portal/' . $slug . '/order';
    }

    // ═══════════════════════════════════════════════════════════════════
    // الإرسال
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @return array{sent: bool, info: string}
     */
    private function send(Company $company, string $to, string $text): array
    {
        $mode = (string) Setting::getSetting('whatsapp_mode', 'mock', $company->id);

        if ($mode === 'live') {
            $phoneNumberId  = (string) Setting::getSetting('whatsapp_phone_number_id', '', $company->id);
            $accessToken    = (string) Setting::getSetting('whatsapp_access_token', '', $company->id);

            if ($phoneNumberId === '' || $accessToken === '') {
                return ['sent' => false, 'info' => 'missing_credentials'];
            }

            try {
                $response = Http::withToken($accessToken)
                    ->baseUrl('https://graph.facebook.com')
                    ->asJson()
                    ->post('/v21.0/' . $phoneNumberId . '/messages', [
                        'messaging_product' => 'whatsapp',
                        'recipient_type'    => 'individual',
                        'to'                => $to,
                        'type'              => 'text',
                        'text'              => ['body' => $text],
                    ]);

                return $response->successful()
                    ? ['sent' => true, 'info' => 'graph_ok']
                    : ['sent' => false, 'info' => 'Graph API ' . $response->status() . ': ' . substr((string) $response->body(), 0, 200)];
            } catch (\Throwable $e) {
                return ['sent' => false, 'info' => $e->getMessage()];
            }
        }

        Log::info('WHATSAPP_MOCK_SEND', [
            'company_id' => $company->id,
            'to'         => $to,
            'text'       => $text,
        ]);

        return ['sent' => true, 'info' => 'mock'];
    }
}