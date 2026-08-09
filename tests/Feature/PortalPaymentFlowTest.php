<?php

/**
 * بوابة الزبائن — الدفع الإلكتروني للطلبات (ترقية PRO رقم 3)
 *
 * يغطي أمن تدفق الدفع كاملاً:
 *   - الحواجز: الدفع غير مفعّل (409) + طلب مدفوع (409)
 *   - نية الدفع: إنشاء + idempotent (نفس الرابط للمحاولة الثانية)
 *   - الـ webhook: توقيع مزوّر (403) · مبلغ مخالف للنية (422)
 *                 · إشعار منتهٍ زمنياً (422) · مرجع غير معروف (404)
 *   - التطبيق: نجاح → succeeded + transaction + paid_at
 *   - حماية إعادة اللعب: نفس العملية no-op · عملية أخرى (409)
 *   - حالة cancelled تُسجَّل دون تسوية
 */

use App\Models\PortalUser;
use App\Models\Setting;
use App\Models\User;
use App\Services\Payments\Gateway\GatewayConfig;
use App\Services\Payments\Gateway\MockGateway;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $now = now();

    $companyId = DB::table('companies')->insertGetId([
        'name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $u1 = User::query()->create(['name' => 'Owner Admin', 'email' => TEST_TENANT_EMAIL, 'password' => 'password'])->id;
    DB::table('companies')->where('id', $companyId)->update(['owner_id' => $u1]);

    $fyId = DB::table('fiscal_years')->insertGetId([
        'company_id' => $companyId, 'name' => 'FY 2026',
        'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
        'is_closed' => false, 'is_current' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $opId = DB::table('document_base_operations')->insertGetId([
        'company_id' => $companyId, 'name' => 'sale', 'label' => 'بيع', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $whId = DB::table('warehouses')->insertGetId([
        'company_id' => $companyId, 'name' => 'مستودع رئيسي', 'code' => 'WH1', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $curId = DB::table('currencies')->insertGetId([
        'company_id' => $companyId, 'name' => 'دينار جزائري', 'code' => 'DZD', 'symbol' => 'دج',
        'decimal_places' => 2, 'is_base_currency' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $tatId = DB::table('treasury_account_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'cash', 'label' => 'صندوق', 'active' => true,
        'display_order' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $treasuryId = DB::table('treasury_accounts')->insertGetId([
        'company_id' => $companyId, 'name' => 'الصندوق الرئيسي', 'code' => 'CASH',
        'treasury_account_type_id' => $tatId, 'currency_id' => $curId,
        'is_default' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $payModeId = DB::table('payment_modes')->insertGetId([
        'company_id' => $companyId, 'name' => 'نقداً', 'code' => 'CASH',
        'description' => null, 'treasury_account_id' => $treasuryId,
        'is_cash' => true, 'active' => true,
        'display_order' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $this->paymentModeId = $payModeId;

    $ptId = DB::table('party_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'client', 'label' => 'زبون', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $partyId = DB::table('parties')->insertGetId([
        'company_id' => $companyId, 'party_type_id' => $ptId,
        'name' => 'زبون البوابة', 'slug' => 'portal-client',
        'credit_limit' => 0, 'is_tva_exempt' => false, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $tva9 = DB::table('tvas')->insertGetId([
        'company_id' => $companyId, 'name' => 'TVA 9%', 'rate' => 9, 'active' => true,
        'is_default' => false, 'display_order' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $unitId = DB::table('units')->insertGetId([
        'company_id' => $companyId, 'name' => 'وحدة', 'symbol' => 'U',
        'active' => true, 'display_order' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $levelId = DB::table('price_levels')->insertGetId([
        'company_id' => $companyId, 'name' => 'التفصيل', 'is_default' => true,
        'is_percentage' => false, 'value' => 0, 'active' => true, 'display_order' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $product = function (string $name, string $ref, float $purchase, float $price, int $tvaId) use ($companyId, $unitId, $levelId, $now) {
        $id = DB::table('products')->insertGetId([
            'company_id' => $companyId, 'name' => $name, 'slug' => str()->slug($name . '-' . $ref),
            'ref' => $ref, 'barcode' => null,
            'tva_id' => $tvaId, 'unit_id' => $unitId,
            'purchase_price_ht' => $purchase, 'current_cost_price' => 0,
            'manages_stock' => true, 'allow_negative_stock' => false,
            'min_stock_alert' => 0, 'active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('product_prices')->insert([
            'company_id' => $companyId, 'product_id' => $id, 'price_level_id' => $levelId,
            'pricing_method' => 'fixed', 'price' => $price, 'rate' => 0, 'margin' => 0,
            'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        return $id;
    };

    $productA = $product('منتج ألف', 'A001', 100, 120, $tva9);

    $portal = PortalUser::query()->create([
        'company_id' => $companyId, 'party_id' => $partyId,
        'name' => 'زبون البوابة', 'email' => 'portal@example.test',
        'password' => 'password', 'is_active' => true,
    ]);

    $this->productA = $productA;
    $this->token = $portal->createToken('test')->plainTextToken;
});

/** معرّف شركة الاختبار الفعلي (الإدراج داخل beforeEach). */
function portalPaymentCompanyId(): int
{
    return (int) DB::table('companies')->where('slug', TEST_COMPANY_SLUG)->value('id');
}

/** تفعيل الدفع الإلكتروني على شركة الاختبار + مسح cache الإعدادات. */
function enableOnlinePayment(int $companyId): void
{
    foreach (['online_payment_enabled', 'online_payment_provider', 'online_payment_mode', 'online_payment_merchant_id', 'online_payment_secret_key'] as $key) {
        Setting::clearCacheForKey($key, $companyId);
    }

    Setting::query()->create([
        'company_id'   => $companyId,
        'key'          => 'online_payment_enabled',
        'value'        => 'true',
        'type'         => 'boolean',
        'group'        => 'portal',
        'is_public'    => true,
        'is_editable'  => true,
        'display_order' => 1,
    ]);
}

/** بوابة النموذج بنفس إعدادات المصنع الافتراضية (secret افتراضي mock-secret). */
function portalGateway(): MockGateway
{
    return new MockGateway(new GatewayConfig(
        provider:   'mock',
        mode:       'sandbox',
        merchantId: '',
        secretKey:  '',
    ));
}

/** إشعار webhook موقّع بشكل صحيح — يحاكي ما يرسله نموذج/بوابة حقيقية. */
function signedWebhook(array $payload): array
{
    $payload['signature'] = portalGateway()->sign($payload);

    return $payload;
}

function portalPayUrl(int $orderId): string
{
    return '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders/'.$orderId.'/pay';
}

function portalWebhookUrl(): string
{
    return '/api/v1/'.TEST_COMPANY_SLUG.'/portal/payment/webhook';
}

/** إنشاء طلب زبون جاهز (2× منتج ألف = 240 HT / TVA 9% = 261.60 TTC). */
function portalCreateOrder(): array
{
    return test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');
}

/** إنشاء نية دفع واحدة وتفويضها (بدء دفع). */
function portalStartPayment(int $orderId): array
{
    return test()->withToken(test()->token)->postJson(portalPayUrl($orderId))
        ->assertOk()
        ->json('data');
}

it('rejects starting a payment while online payment is disabled', function () {
    // الإعداد غير مفعّل افتراضياً (لا صف settings) — نتأكد ألا cache قديم يلطّخ.
    Setting::clearCacheForKey('online_payment_enabled', portalPaymentCompanyId());

    $order = portalCreateOrder();

    test()->withToken(test()->token)->postJson(portalPayUrl($order['id']))
        ->assertStatus(409)
        ->assertJsonPath('message', 'الدفع الإلكتروني غير مفعّل حالياً لهذه المؤسسة.');
});

it('creates a single payment intent and returns the gateway page (idempotent)', function () {
    enableOnlinePayment(portalPaymentCompanyId());

    $order = portalCreateOrder();

    $first = portalStartPayment($order['id']);

    expect($first['payment_status'])->toBe('pending')
        ->and($first['payment_intent_id'])->toMatch('/^MOCK-[A-Z0-9]{16}$/')
        ->and((float) $first['amount'])->toBe((float) $order['total_ttc'])
        ->and($first['payment_url'])->toContain('/portal-gateway/mock/'.$first['payment_intent_id']);

    // إعادة الضغط على «ادفع» تعيد نفس النية والرابط دون بوابة ثانية.
    $second = portalStartPayment($order['id']);

    expect($second['payment_intent_id'])->toBe($first['payment_intent_id'])
        ->and($second['payment_url'])->toBe($first['payment_url'])
        ->and($second['payment_status'])->toBe('pending');
});

it('webhook rejects a forged signature', function () {
    enableOnlinePayment(portalPaymentCompanyId());
    $intent = portalStartPayment(portalCreateOrder()['id']);

    test()->postJson(portalWebhookUrl(), [
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'],
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-FORGE001',
        'ts'             => time(),
        'signature'      => 'forged-signature',
    ])
        ->assertStatus(403)
        ->assertJsonPath('message', 'توقيع إشعار الدفع غير صالح.');
});

it('webhook settles a succeeded payment, then blocks replay with a different transaction', function () {
    enableOnlinePayment(portalPaymentCompanyId());
    $order  = portalCreateOrder();
    $intent = portalStartPayment($order['id']);

    $payload = signedWebhook([
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'],
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-TEST001',
        'ts'             => time(),
    ]);

    $response = test()->postJson(portalWebhookUrl(), $payload)
        ->assertOk()
        ->assertJsonPath('data.payment_status', 'succeeded')
        ->assertJsonPath('data.payment_transaction_id', 'MOCKTXN-TEST001')
        ->assertJsonPath('message', 'تم استلام إشعار الدفع بنجاح');

    expect((float) $response->json('data.payment_amount'))->toBe((float) $intent['amount'])
        ->and($response->json('data.paid_at'))->not->toBeNull();

    // إعادة اللعب بنفس العملية = no-op آمن (لا خطأ ولا عملية جديدة).
    test()->postJson(portalWebhookUrl(), $payload)
        ->assertOk()
        ->assertJsonPath('data.payment_status', 'succeeded');

    // طلب مدفوع: لا يمكن بدء دفع جديد.
    test()->withToken(test()->token)->postJson(portalPayUrl($order['id']))
        ->assertStatus(409)
        ->assertJsonPath('message', 'هذا الطلب مدفوع بالفعل.');

    // إشعار بعملية أخرى لنفس النية = رفض 409.
    $other = signedWebhook([
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'],
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-TEST002',
        'ts'             => time(),
    ]);

    test()->postJson(portalWebhookUrl(), $other)
        ->assertStatus(409)
        ->assertJsonPath('message', 'تم تأكيد عملية دفع أخرى لهذا الطلب مسبقاً.');
});

it('webhook rejects a mismatched amount and an expired notification', function () {
    enableOnlinePayment(portalPaymentCompanyId());
    $intent = portalStartPayment(portalCreateOrder()['id']);

    // مبلغ مختلف عن النية (المحسوب في الخادم) — مرفوض رغم التوقيع الصحيح.
    $wrongAmount = signedWebhook([
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'] + 10,
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-AMT001',
        'ts'             => time(),
    ]);

    test()->postJson(portalWebhookUrl(), $wrongAmount)
        ->assertStatus(422)
        ->assertJsonPath('message', 'مبلغ إشعار الدفع لا يطابق قيمة الطلب.');

    // إشعار قديم (أكبر من ساعة) — يوقف إعادة اللعب القديمة.
    $expired = signedWebhook([
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'],
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-OLD001',
        'ts'             => time() - 7200,
    ]);

    test()->postJson(portalWebhookUrl(), $expired)
        ->assertStatus(422)
        ->assertJsonPath('message', 'إشعار الدفع منتهي الصلاحية.');
});

it('webhook rejects an unknown intent reference', function () {
    $payload = signedWebhook([
        'reference'      => 'MOCK-UNKNOWNREF01',
        'amount'         => 100.0,
        'status'         => 'succeeded',
        'transaction_id' => 'MOCKTXN-UNK001',
        'ts'             => time(),
    ]);

    test()->postJson(portalWebhookUrl(), $payload)
        ->assertStatus(404)
        ->assertJsonPath('message', 'لا توجد نية دفع بهذا المرجع.');
});

it('webhook records a cancelled status without settling the order', function () {
    enableOnlinePayment(portalPaymentCompanyId());
    $intent = portalStartPayment(portalCreateOrder()['id']);

    $payload = signedWebhook([
        'reference'      => $intent['payment_intent_id'],
        'amount'         => $intent['amount'],
        'status'         => 'cancelled',
        'transaction_id' => 'MOCKTXN-CANC001',
        'ts'             => time(),
    ]);

    $response = test()->postJson(portalWebhookUrl(), $payload)
        ->assertOk()
        ->assertJsonPath('data.payment_status', 'cancelled');

    // لم تُسوَّى العملية: لا تاريخ دفع، ويبقى الزبون قادراً على إعادة الدفع.
    expect($response->json('data.paid_at'))->toBeNull();

    test()->withToken(test()->token)->postJson(portalPayUrl($response->json('data.id')))
        ->assertOk()
        ->assertJsonPath('data.payment_status', 'pending');
});
