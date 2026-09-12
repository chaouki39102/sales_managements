<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
    $this->companyId = seedWhatsAppWorkspace();
});

/**
 * Seed the exact workspace shape used by PortalOrderRequestTest (lines 21-122)
 * plus a TVA 9% rate and price levels needed for CMD pricing.
 */
function seedWhatsAppWorkspace(): int
{
    $companyId = \Illuminate\Support\Facades\DB::table('companies')->insertGetId([
        'name' => 'Test Company',
        'slug' => TEST_COMPANY_SLUG,
        'active' => true,
    ]);
    $userId = \Illuminate\Support\Facades\DB::table('users')->insertGetId([
        'name' => 'Owner Admin',
        'email' => TEST_TENANT_EMAIL,
        'password' => \Illuminate\Support\Facades\Hash::make('password'),
    ]);
    \Illuminate\Support\Facades\DB::table('companies')->where('id', $companyId)->update(['owner_id' => $userId]);
    \Illuminate\Support\Facades\DB::table('company_user')->insert([
        'company_id' => $companyId,
        'user_id' => $userId,
        'role' => 'owner',
        'active' => true,
    ]);
    \Illuminate\Support\Facades\DB::table('fiscal_years')->insert([
        'company_id' => $companyId,
        'name' => 'FY 2026',
        'start_date' => '2026-01-01',
        'end_date' => '2026-12-31',
        'is_closed' => false,
        'is_current' => true,
    ]);
    \Illuminate\Support\Facades\DB::table('document_base_operations')->insert([
        'company_id' => $companyId,
        'name' => 'sale',
        'label' => 'بيع',
        'active' => true,
    ]);
    \Illuminate\Support\Facades\DB::table('warehouses')->insertGetId([
        'company_id' => $companyId,
        'name' => 'مستودع رئيسي',
        'code' => 'WH1',
        'active' => true,
    ]);
    $currencyId = \Illuminate\Support\Facades\DB::table('currencies')->insertGetId([
        'company_id' => $companyId,
        'name' => 'دينار جزائري',
        'code' => 'DZD',
        'symbol' => 'دج',
        'decimal_places' => 2,
        'is_base_currency' => true,
        'active' => true,
    ]);
    $treasuryAccountTypeId = \Illuminate\Support\Facades\DB::table('treasury_account_types')->insertGetId([
        'company_id' => $companyId,
        'name' => 'cash',
        'label' => 'صندوق',
        'active' => true,
        'display_order' => 1,
    ]);
    $treasuryId = \Illuminate\Support\Facades\DB::table('treasury_accounts')->insertGetId([
        'company_id' => $companyId,
        'name' => 'الصندوق الرئيسي',
        'code' => 'CASH',
        'treasury_account_type_id' => $treasuryAccountTypeId,
        'currency_id' => $currencyId,
        'is_default' => true,
        'active' => true,
    ]);
    \Illuminate\Support\Facades\DB::table('payment_modes')->insertGetId([
        'company_id' => $companyId,
        'name' => 'نقداً',
        'code' => 'CASH',
        'description' => null,
        'treasury_account_id' => $treasuryId,
        'is_cash' => true,
        'active' => true,
        'display_order' => 1,
    ]);
    $clientTypeId = \Illuminate\Support\Facades\DB::table('party_types')->insertGetId([
        'company_id' => $companyId,
        'name' => 'client',
        'label' => 'زبون',
        'active' => true,
    ]);
    $tvaId = \Illuminate\Support\Facades\DB::table('tvas')->insertGetId([
        'company_id' => $companyId,
        'name' => 'TVA 9%',
        'rate' => 9,
        'active' => true,
        'is_default' => false,
        'display_order' => 1,
    ]);
    $unitId = \Illuminate\Support\Facades\DB::table('units')->insertGetId([
        'company_id' => $companyId,
        'name' => 'وحدة',
        'symbol' => 'U',
        'active' => true,
        'display_order' => 1,
    ]);
    $priceLevelId = \Illuminate\Support\Facades\DB::table('price_levels')->insertGetId([
        'company_id' => $companyId,
        'name' => 'التفصيل',
        'is_default' => true,
        'is_percentage' => false,
        'value' => 0,
        'active' => true,
        'display_order' => 1,
    ]);

    $seedProduct = function (string $name, string $ref, float $price, ?string $barcode = null) use ($companyId, $tvaId, $unitId, $priceLevelId) {
        $productId = \Illuminate\Support\Facades\DB::table('products')->insertGetId([
            'company_id' => $companyId,
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name . '-' . $ref),
            'ref' => $ref,
            'barcode' => $barcode,
            'tva_id' => $tvaId,
            'unit_id' => $unitId,
            'purchase_price_ht' => $price,
            'current_cost_price' => $price,
            'manages_stock' => false,
            'allow_negative_stock' => true,
            'min_stock_alert' => 0,
            'active' => true,
        ]);
        \Illuminate\Support\Facades\DB::table('product_prices')->insert([
            'company_id' => $companyId,
            'product_id' => $productId,
            'price_level_id' => $priceLevelId,
            'pricing_method' => 'fixed',
            'price' => $price,
            'rate' => 0,
            'margin' => 0,
            'active' => true,
        ]);
        return $productId;
    };

    $seedProduct('حليب', 'MLK', 120);
    $seedProduct('سكر', 'SUG', 60);
    $seedProduct('صابون', 'SOAP', 100, '6111252425017');

    return $companyId;
}

/**
 * Seed one whatsapp setting. Company settings beat global settings (Setting::getSetting
 * reads company-first-then-global). Boolean values are stored as raw 'true'/'false'.
 */
function waSeedSetting(?int $companyId, string $key, string $value, string $type, int $order, string $group = 'whatsapp'): void
{
    \Illuminate\Support\Facades\DB::table('settings')->updateOrInsert(
        ['company_id' => $companyId, 'key' => $key],
        [
            'type' => $type,
            'value' => $value,
            'group' => $group,
            'display_order' => $order,
            'updated_at' => now(),
        ]
    );
    Cache::forget('setting:' . ($companyId ?? '') . ':' . $key);
}

/**
 * Build a Meta-style webhook payload for a single text message.
 */
function waPostPayload(string $body, string $from = '0555000111', string $name = 'أحمد'): array
{
    return [
        'object' => 'whatsapp_business_account',
        'entry' => [[
            'id' => '100000000000001',
            'changes' => [[
                'value' => [
                    'messaging_product' => 'whatsapp',
                    'metadata' => ['display_phone_number' => '0555000111', 'phone_number_id' => '111111111111111'],
                    'contacts' => [['profile' => ['name' => $name], 'wa_id' => $from]],
                    'messages' => [[
                        'from' => $from,
                        'id' => 'wamid.ABC123',
                        'timestamp' => '1700000000',
                        'type' => 'text',
                        'text' => ['body' => $body],
                    ]],
                ],
            ]],
        ]],
    ];
}

it('processes a successful order message and creates a party + order', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook', waPostPayload('2 حليب، 1 سكر'))
        ->assertStatus(200)
        ->assertJson([
            'status' => 'processed',
            'ok' => true,
            'skipped' => false,
            'error' => null,
            'order_reference' => 'CMD-2026-000001',
            'reply' => "تم استلام طلبك بنجاح ✅\nرقم الطلب: CMD-2026-000001\n1. حليب — 2 × 120.00 دج\n2. سكر — 1 × 60.00 دج\nالمجموع: 327.00 دج",
            'sent' => true,
            'info' => 'mock',
        ]);

    $this->assertDatabaseHas('parties', [
        'company_id' => $this->companyId,
        'name' => 'أحمد',
        'phone' => '0555000111',
        'code' => 'WA555000111',
    ]);
    $this->assertDatabaseHas('commercial_documents', [
        'company_id' => $this->companyId,
        'document_number' => 'CMD-2026-000001',
    ]);
});

it('matches a product by barcode from the message', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook', waPostPayload('2 6111252425017'))
        ->assertStatus(200)
        ->assertJson([
            'status' => 'processed',
            'ok' => true,
            'order_reference' => 'CMD-2026-000001',
            'reply' => "تم استلام طلبك بنجاح ✅\nرقم الطلب: CMD-2026-000001\n1. صابون — 2 × 100.00 دج\nالمجموع: 218.00 دج",
        ]);
});

it('processes an order via the mock-send endpoint', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    waSeedSetting($this->companyId, 'whatsapp_mode', 'mock', 'string', 2);

    $response = $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/mock-send', [
        'phone' => '0555000111',
        'text' => '2 حليب، 1 سكر',
        'name' => 'أحمد',
    ]);

    $response->assertStatus(200)->assertJsonPath('status', 'success');
    $response->assertJsonPath('message', 'تمت معالجة طلب واتساب بنجاح.');
    $response->assertJsonPath('data.ok', true);
    $response->assertJsonPath('data.skipped', false);
    $response->assertJsonPath('data.order_reference', 'CMD-2026-000001');
    $response->assertJsonPath('data.phone', '0555000111');
    $response->assertJsonPath('data.sent', true);
    $response->assertJsonPath('data.info', 'mock');
    $response->assertJsonPath('data.reply', "تم استلام طلبك بنجاح ✅\nرقم الطلب: CMD-2026-000001\n1. حليب — 2 × 120.00 دج\n2. سكر — 1 × 60.00 دج\nالمجموع: 327.00 دج");
});

it('skips when whatsapp is disabled (webhook and mock-send)', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'false', 'boolean', 1);

    $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook', waPostPayload('2 حليب'))
        ->assertStatus(200)
        ->assertJson([
            'status' => 'processed',
            'skipped' => true,
            'reason' => 'disabled',
        ]);

    $this->assertDatabaseCount('parties', 0);
    $this->assertDatabaseCount('commercial_documents', 0);

    // mock-send rejects with BusinessRuleException (422) → HTTP 500 under the empty exception map
    $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/mock-send', [
        'phone' => '0555000111',
        'text' => '2 حليب',
    ])->assertStatus(500);
});

it('responds to the webhook verification challenge and rejects bad tokens', function () {
    $base = '/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook';

    $verifyUrl = function (string $token, string $challenge) use ($base): string {
        return $base . '?' . http_build_query([
            'hub.mode' => 'subscribe',
            'hub.verify_token' => $token,
            'hub.challenge' => $challenge,
        ]);
    };

    $this->get($verifyUrl('wrong-token', 'challenge-123'))
        ->assertStatus(403)
        ->assertJson(['error' => 'verification failed']);

    waSeedSetting(null, 'whatsapp_verify_token', 'test-token', 'string', 1);

    $response = $this->get($verifyUrl('test-token', 'challenge-123'));
    $response->assertStatus(200);
    $this->assertSame('challenge-123', json_decode($response->getContent()));
});

it('processes a live request with a valid HMAC signature', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    waSeedSetting($this->companyId, 'whatsapp_mode', 'live', 'string', 2);
    waSeedSetting($this->companyId, 'whatsapp_app_secret', 'test-secret', 'string', 3);

    $payload = waPostPayload('2 حليب');
    $raw = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $sig = 'sha256=' . hash_hmac('sha256', $raw, 'test-secret');

    $response = $this->call(
        'POST',
        '/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook',
        [],
        [],
        [],
        ['HTTP_CONTENT_TYPE' => 'application/json', 'HTTP_X_HUB_SIGNATURE_256' => $sig],
        $raw
    );

    $response->assertStatus(200);
    $response->assertJson([
        'status' => 'processed',
        'ok' => true,
        'order_reference' => 'CMD-2026-000001',
        'sent' => false,
        'info' => 'missing_credentials',
    ]);
});

it('rejects invalid JSON with an error response', function () {
    $response = $this->call(
        'POST',
        '/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook',
        [],
        [],
        [],
        ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
        '{this is not json'
    );

    $response->assertStatus(200)->assertJson([
        'status' => 'processed',
        'ok' => false,
        'error' => 'invalid_json',
    ]);
});

it('skips non-text messages', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    $payload = waPostPayload('2 حليب');
    $payload['entry'][0]['changes'][0]['value']['messages'][0]['type'] = 'delivery';
    unset($payload['entry'][0]['changes'][0]['value']['messages'][0]['text']);

    $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook', $payload)
        ->assertStatus(200)
        ->assertJson([
            'status' => 'processed',
            'skipped' => true,
            'reason' => 'no_text',
        ]);

    $this->assertDatabaseCount('parties', 0);
    $this->assertDatabaseCount('commercial_documents', 0);
});

it('reports a parse error and still creates the party', function () {
    waSeedSetting($this->companyId, 'whatsapp_enabled', 'true', 'boolean', 1);
    $response = $this->postJson('/api/v1/' . TEST_COMPANY_SLUG . '/whatsapp/webhook', waPostPayload('غريب'));

    $response->assertStatus(200);
    $response->assertJson([
        'status' => 'processed',
        'ok' => false,
        'skipped' => false,
        'order_reference' => null,
        'error' => 'تعذّرت قراءة السطر التالي من طلبك: «غريب»',
    ]);

    $this->assertDatabaseHas('parties', [
        'company_id' => $this->companyId,
        'name' => 'أحمد',
        'phone' => '0555000111',
    ]);
    $this->assertDatabaseCount('commercial_documents', 0);
});