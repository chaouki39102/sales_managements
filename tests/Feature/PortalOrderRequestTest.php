<?php

/**
 * بوابة الزبائن — طلبات السلع (وصل طلب سلعة)
 *
 * يغطي دورة حياة الطلب بالكامل:
 *   زبون → كتالوج (سعر + مخزون من الخادم)
 *        → إنشاء طلب (الأسعار تُحسب خادمياً ولا تُقبل من العميل)
 *        → قائمة طلباته + تفاصيل
 *   إدارة → قائمة طلبات المؤسسة + تغيير الحالة
 */

use App\Models\Party;
use App\Models\PortalUser;
use App\Models\User;
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
            'manages_stock' => true, 'allow_negative_stock' => true,
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
    $productB = $product('منتج باء', 'B001', 50, 60, $tva9);

    $portal = PortalUser::query()->create([
        'company_id' => $companyId, 'party_id' => $partyId,
        'name' => 'زبون البوابة', 'email' => 'portal@example.test',
        'password' => 'password', 'is_active' => true,
    ]);

    $this->productA = $productA;
    $this->productB = $productB;
    $this->token = $portal->createToken('test')->plainTextToken;
});

function portalOrderAuthGet(string $url)
{
    return test()->withToken(test()->token)->getJson($url);
}

it('customer can list catalog products with server-side price and stock', function () {
    $response = portalOrderAuthGet('/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders/catalog')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2)
        ->assertJsonPath('data.meta.per_page', 24)
        ->assertJsonPath('data.meta.current_page', 1)
        ->assertJsonPath('data.meta.last_page', 1);

    $rows = collect($response->json('data.data'));
    expect($rows)->toHaveCount(2);

    $a = $rows->firstWhere('id', test()->productA);
    expect((float) $a['unit_price_ht'])->toBe(120.0)
        ->and((float) $a['tva_rate'])->toBe(9.0)
        ->and($a['unit']['symbol'])->toBe('U');
});

it('customer submits an order and server recomputes prices (client prices ignored)', function () {
    // نرسل سعراً مزوّراً (1000) — يجب أن يتجاهله الخادم ويحسب من المنتج (120)
    portalOrderAuthGet('/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders')->assertOk();

    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $response = test()->withToken(test()->token)->postJson($url, [
        'items' => [
            ['product_id' => test()->productA, 'quantity' => 2, 'unit_price_ht' => 1000],
            ['product_id' => test()->productB, 'quantity' => 1],
        ],
        'notes' => 'يرجى التواصل قبل التسليم',
    ]);

    $response->assertStatus(201);
    $data = $response->json('data');

    // 2×120 HT + 1×60 HT = 300 HT ; TVA 9% = 27 ; TTC = 327
    expect((float) $data['total_ht'])->toBe(300.0)
        ->and((float) $data['total_tva'])->toBe(27.0)
        ->and((float) $data['total_ttc'])->toBe(327.0)
        ->and($data['status'])->toBe('pending')
        // المرجع = رقم مستند أمر الزبون (CMD) — الغلاف أصبح مبنيّاً على المستند
        ->and($data['reference'])->toMatch('/^CMD-\d{4}-\d{6}$/')
        ->and(count($data['lines']))->toBe(2)
        // الواجهات الأمامية تقرأ «items» بينما الاختبارات القديمة تقرأ «lines»
        ->and(count($data['items']))->toBe(2)
        ->and($data['document']['document_type'])->toBe('CMD');

    // السعر الذي خزنه الخادم هو سعر المنتج وليس 1000 المزوّر
    $a = collect($data['lines'])->firstWhere('product_id', test()->productA);
    expect((float) $a['unit_price_ht'])->toBe(120.0)
        ->and((float) $a['quantity'])->toBe(2.0)
        ->and((float) $a['total_ht'])->toBe(240.0);

    // تظهر في قائمة طلبات الزبون
    $list = portalOrderAuthGet($url)->assertOk()->json('data.data');
    expect(collect($list)->firstWhere('id', $data['id']))->not->toBeNull();

    // تفاصيل الطلب
    portalOrderAuthGet($url.'/'.$data['id'])
        ->assertOk()
        ->assertJsonPath('data.reference', $data['reference']);
});

it('admin can list company orders and change status', function () {
    // زبون ينشئ طلباً
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 5]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();

    // إدارة: قائمة الطلبات
    $adminList = test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders')
        ->assertOk()
        ->json('data.data');

    expect($adminList)->toHaveCount(1);
    $order = $adminList[0];
    expect((float) $order['total_ttc'])->toBe(round(5 * 120 * 1.09, 2))
        ->and($order['party']['name'])->toBe('زبون البوابة');

    // إدارة: تغيير الحالة إلى قيد التجهيز
    test()->patchJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$order['id'], [
        'status' => 'processing',
    ])->assertOk()
        ->assertJsonPath('data.status', 'processing')
        ->assertJsonPath('data.status_label', 'قيد التجهيز');

    // فلترة بالحالة
    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders?status=processing')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1);

    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders?status=pending')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 0);
});

it('customer can cancel a pending order', function () {
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 1]]]
    )->assertStatus(201)->json('data');

    test()->withToken(test()->token)
        ->postJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders/'.$created['id'].'/cancel')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.status_label', 'ملغى');
});

it('customer cannot cancel an order once processing started', function () {
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 1]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    test()->patchJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'], ['status' => 'processing'])
        ->assertOk();

    // الزبون لم يعد يستطيع الإلغاء بعد أن بدأت الإدارة التجهيز
    test()->withToken(test()->token)
        ->postJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders/'.$created['id'].'/cancel')
        ->assertStatus(422);
});

it('admin can convert a processing order into an FV invoice (completes the pipeline)', function () {
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();

    // إدارة: التجهيز
    test()->patchJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'], ['status' => 'processing'])
        ->assertOk()
        ->assertJsonPath('data.status', 'processing');

    // إدارة: التحويل إلى فاتورة
    $res = test()->postJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'].'/convert', ['target' => 'FV'])
        ->assertOk()
        ->json('data');

    // الصافي = TTC + الطابع الجبائي (الحد الأدنى 5 دج)
    $ttc    = round(2 * 120 * 1.09, 2);
    $stamp  = max(5, min(round($ttc * 0.01, 2), 2500));

    expect($res['sale']['document_number'])->toMatch('/^FV-\d{4}-\d{6}$/')
        ->and((float) $res['sale']['net_to_pay'])->toBe(round($ttc + $stamp, 2))
        ->and($res['sale']['document_type'])->toBe('FV')
        ->and($res['order']['status'])->toBe('completed')
        ->and($res['order']['status_label'])->toBe('مكتمل');

    // الطلب أصبح مكتملاً ولا يمكن تغييره بعد الآن
    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'])
        ->assertOk()
        ->assertJsonPath('data.status', 'completed');

    test()->patchJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'], ['status' => 'pending'])
        ->assertStatus(409);
});
