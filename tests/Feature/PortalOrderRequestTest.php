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
        ->and($a['unit']['symbol'])->toBe('U')
        ->and(array_key_exists('image', $a))->toBeTrue();
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
        ->and($data['status'])->toBe('preparing')
        // المرجع = رقم مستند أمر الزبون (CMD) — الغلاف أصبح مبنيّاً على المستند
        ->and($data['reference'])->toMatch('/^CMD-\d{4}-\d{6}$/')
        ->and(count($data['lines']))->toBe(2)
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

it('admin can list company orders and drive status step by step', function () {
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
        ->and($order['party']['name'])->toBe('زبون البوابة')
        // الواجهة ترى الخطوات التالية المسموحة فقط (لا اختيار حر للحالات)
        ->and($order['allowed_next'])->toBe(['confirmed', 'cancelled']);

    $adminUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$order['id'];

    // لا قفز للأمام: قيد الاعداد → تم المعالجة مرفوض من الخادم
    test()->patchJson($adminUrl, ['status' => 'processed'])
        ->assertStatus(409)
        ->assertJsonPath('message', 'لا يمكن الانتقال من «قيد الاعداد» إلى «تم المعالجة» مباشرة — الطلب يسير خطوة واحدة في كل مرة. الخطوة التالية المسموحة: مؤكد أو ملغى.');

    // الخطوة الأولى: قيد الاعداد → مؤكد
    test()->patchJson($adminUrl, ['status' => 'confirmed'])
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.status_label', 'مؤكد')
        ->assertJsonPath('data.allowed_next', ['processed']);

    // الخطوة الثانية: مؤكد → تم المعالجة
    test()->patchJson($adminUrl, ['status' => 'processed'])
        ->assertOk()
        ->assertJsonPath('data.status', 'processed')
        ->assertJsonPath('data.allowed_next', ['shipped']);

    // فلترة بالحالة
    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders?status=processed')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1);

    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders?status=preparing')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 0);
});

it('customer confirms his order (preparing → confirmed) then loses all further actions', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    expect($created['status'])->toBe('preparing');

    // تأكيد الطلب من الزبون (الخطوة الاحترافية): قيد الاعداد → مؤكد
    test()->withToken(test()->token)->postJson($url.'/'.$created['id'].'/validate')
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed');

    // بعد التأكيد لا يملك الزبون أي تصرف آخر: لا إلغاء ولا تعديل
    test()->withToken(test()->token)->postJson($url.'/'.$created['id'].'/cancel')
        ->assertStatus(422);

    test()->withToken(test()->token)->patchJson($url.'/'.$created['id'], [
        'items' => [['product_id' => test()->productB, 'quantity' => 1]],
    ])->assertStatus(409);

    // الحالة بقيت مؤكدة
    portalOrderAuthGet($url.'/'.$created['id'])
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed');
});

it('admin convert is rejected before confirm and lines editing is closed after shipped', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 3]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    // ملخص المراحل قبل أي تغيير
    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/summary')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.preparing', 1)
        ->assertJsonPath('data.confirmed', 0);

    // لا تحويل قبل تأكيد الطلب
    test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])
        ->assertStatus(409)
        ->assertJsonPath('message', 'يجب تأكيد الطلب أولاً (من الزبون أو من المسؤول) قبل تحويله إلى فاتورة.');

    // خط الأنابيب الصارم — خطوة واحدة في كل مرة:
    // قيد الاعداد → مؤكد → تم المعالجة → الشحن
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])->assertOk();
    test()->patchJson($adminOrderUrl, ['status' => 'processed'])->assertOk();
    test()->patchJson($adminOrderUrl, ['status' => 'shipped'])->assertOk();

    // بعد الشحن يغلق تحرير الأسطر (الواجهة والخدمة معاً)
    test()->patchJson($adminOrderUrl.'/lines', [
        'lines' => [['line_id' => $created['lines'][0]['line_id'], 'quantity' => 1]],
    ])->assertStatus(409);

    // ملخص المراحل بعد الوصول إلى الشحن
    test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/summary')
        ->assertOk()
        ->assertJsonPath('data.preparing', 0)
        ->assertJsonPath('data.shipped', 1);
});

it('admin cannot skip or roll back status (delivered → confirmed rejected)', function () {
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    // السير بالطلب حتى تم التسليم (خطوة خطوة)
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])->assertOk();
    test()->patchJson($adminOrderUrl, ['status' => 'processed'])->assertOk();
    test()->patchJson($adminOrderUrl, ['status' => 'shipped'])->assertOk();
    test()->patchJson($adminOrderUrl, ['status' => 'delivered'])->assertOk()
        ->assertJsonPath('data.allowed_next', ['returned']);

    // رجوع مرفوض: تم التسليم → مؤكد
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])
        ->assertStatus(409);

    // من تم التسليم لا يمكن الذهاب إلا إلى مرتجع
    test()->patchJson($adminOrderUrl, ['status' => 'returned'])
        ->assertOk()
        ->assertJsonPath('data.status', 'returned')
        ->assertJsonPath('data.allowed_next', []);

    // حالة نهائية: لا خروج من مرتجع إطلاقاً
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])
        ->assertStatus(409)
        ->assertJsonPath('message', 'لا يمكن تغيير حالة طلب مرتجع أو ملغى.');
});

it('stock availability is scoped to the order warehouse and fiscal year', function () {
    $created = test()->withToken(test()->token)->postJson(
        '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders',
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();

    // تفاصيل المسؤول تتضمن تقرير المخزون لكل سطر (مستودع الطلب + الكل)
    $detail = test()->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'])
        ->assertOk()
        ->json('data');

    expect($detail['stock'])->toHaveCount(1);
    $lineA = collect($detail['stock'])->firstWhere('product_id', test()->productA);

    // منتج يدير مخزوناً بدون حركات → المتاح صفر (لا null) وفي نفس نطاق المستند
    // (الواجهة تستقبل أرقاماً — القيم الصفرية تصل int بعد فك تشفير JSON)
    expect($lineA['available'])->toBe(0)
        ->and($lineA['available_all'])->toBe(0)
        ->and($lineA['required'])->toBe(2)
        ->and($lineA['sufficient'])->toBe(false)
        ->and($lineA['warehouse_id'])->not->toBeNull();
});

it('admin converts a confirmed order into an FV invoice', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    // لا مخزون في التجهيز — نسمح بالمخزون السالب لإتمام حركة التحويل
    DB::table('products')->where('id', test()->productA)->update(['allow_negative_stock' => true]);
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])->assertOk();

    $res = test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])
        ->assertOk()
        ->json('data');

    expect($res['sale']['document_type'])->toBe('FV')
        ->and($res['sale']['document_number'])->toMatch('/^FV-\d{4}-\d{6}$/')
        // بدون دفعة: المدفوع صفر والباقي كامل الصافي
        ->and((float) $res['sale']['paid_amount'])->toBe(0.0)
        ->and((float) $res['sale']['remaining_amount'])->toBe((float) $res['sale']['net_to_pay'])
        // التحويل = القفزة القانونية إلى «تم التسليم»
        ->and($res['order']['status'])->toBe('delivered')
        ->and($res['order']['allowed_next'])->toBe(['returned']);

    // السجل التوثيقي يذكر الفاتورة الناتجة
    $notes = collect($res['order']['histories'])->pluck('note')->implode(' | ');
    expect($notes)->toContain('تم تحويل الطلب إلى فاتورة')
        ->and($notes)->toContain($res['sale']['document_number']);
});

it('admin converts a shipped order into a POS sale and records a payment atomically', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    DB::table('products')->where('id', test()->productA)->update(['allow_negative_stock' => true]);
    foreach (['confirmed', 'processed', 'shipped'] as $step) {
        test()->patchJson($adminOrderUrl, ['status' => $step])->assertOk();
    }

    $res = test()->postJson($adminOrderUrl.'/convert', [
        'target' => 'POS',
        'payment' => [
            'payment_mode_id' => test()->paymentModeId,
            'amount'          => 100,
            'payment_date'    => '2026-08-05',
            'reference'       => 'PAY-TEST',
        ],
    ])->assertOk()->json('data');

    expect($res['sale']['document_type'])->toBe('POS')
        ->and($res['sale']['document_number'])->toMatch('/^POS-\d{4}-\d{6}$/')
        ->and((float) $res['sale']['paid_amount'])->toBe(100.0)
        ->and((float) $res['sale']['remaining_amount'])->toBe(round((float) $res['sale']['net_to_pay'] - 100.0, 2))
        ->and($res['order']['status'])->toBe('delivered');

    // دفعة حقيقية مرتبطة بالفاتورة الناتجة عبر الجدول الوسيط
    $saleId = $res['sale']['id'];
    expect(DB::table('document_payment')->where('commercial_document_id', $saleId)->count())->toBe(1);

    $pay = DB::table('payments')->where('reference', 'PAY-TEST')->first();
    expect((float) $pay->amount)->toBe(100.0)
        ->and((int) $pay->payment_mode_id)->toBe(test()->paymentModeId);
});

it('admin converts from delivered keeping the status (history still recorded)', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    DB::table('products')->where('id', test()->productA)->update(['allow_negative_stock' => true]);
    foreach (['confirmed', 'processed', 'shipped', 'delivered'] as $step) {
        test()->patchJson($adminOrderUrl, ['status' => $step])->assertOk();
    }

    $res = test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])
        ->assertOk()
        ->json('data');

    // من «تم التسليم» يبقى الوضع كما هو (لا قفزة) لكن السجل التوثيقي يُكتب
    expect($res['order']['status'])->toBe('delivered')
        ->and($res['order']['allowed_next'])->toBe(['returned'])
        ->and(collect($res['order']['histories'])->pluck('note')->implode(' | '))
        ->toContain('تم تحويل الطلب إلى فاتورة');
});

it('admin cannot convert the same order twice (transfer-once)', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];

    DB::table('products')->where('id', test()->productA)->update(['allow_negative_stock' => true]);
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])->assertOk();

    // أول تحويل ناجح: يُثبَّت sale_document_id ويصبح is_converted صحيحاً
    $first = test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])
        ->assertOk()
        ->json('data');
    expect((bool) $first['order']['is_converted'])->toBeTrue()
        ->and($first['order']['sale_document_id'])->not->toBeNull();

    // تحويل ثانٍ (حتى من «تم التسليم») مرفوض — لا فاتورتين من طلب واحد
    test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])
        ->assertStatus(409)
        ->assertJsonPath('message', 'تم تحويل هذا الطلب إلى فاتورة مسبقاً — التحويل مسموح مرة واحدة فقط.');

    // التغيير من عدم التحويل قبل النجاح: فاتورة واحدة فقط ناتجة
    $saleId = $first['sale']['id'];
    expect(DB::table('commercial_documents')->where('id', $saleId)->count())->toBe(1);
});

it('admin convert guards: invalid target 422 and cancelled/returned orders 409', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';

    // إنشاء كل الطلبات أولاً بجلسة الزبون ثم التحويل إلى جلسة الإدارة
    // (withToken بعد actingAs يعيد المصادقة إلى زبون البوابة)
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 1]]]
    )->assertStatus(201)->json('data');

    $created2 = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productB, 'quantity' => 1]]]
    )->assertStatus(201)->json('data');

    $created3 = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productB, 'quantity' => 1]]]
    )->assertStatus(201)->json('data');

    actingAsAuthenticatedTenantUser();
    $adminUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];
    $adminUrl2 = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created2['id'];
    $adminUrl3 = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created3['id'];

    // هدف غير مسموح من أمر زبون → 422 (التحقق قبل النداء للخدمة)
    test()->patchJson($adminUrl, ['status' => 'confirmed'])->assertOk();
    test()->postJson($adminUrl.'/convert', ['target' => 'BCF'])
        ->assertStatus(422);

    // طلب مُلغى → 409
    test()->patchJson($adminUrl2, ['status' => 'cancelled'])->assertOk();
    test()->postJson($adminUrl2.'/convert', ['target' => 'FV'])
        ->assertStatus(409)
        ->assertJsonPath('message', 'لا يمكن تحويل طلب تم إرجاعه أو إلغاؤه إلى فاتورة.');

    // طلب مرتجع → 409
    foreach (['confirmed', 'processed', 'shipped', 'delivered', 'returned'] as $step) {
        test()->patchJson($adminUrl3, ['status' => $step])->assertOk();
    }
    test()->postJson($adminUrl3.'/convert', ['target' => 'FV'])
        ->assertStatus(409);
});

it('allowed_next is audience-scoped, notes-only update keeps lines, legacy pending rejected as target', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]], 'notes' => 'ملاحظة أولى']
    )->assertStatus(201)->json('data');

    // 1) الزبون يرى خطواته فقط: قيد الاعداد → [مؤكد، ملغى] (نفس الإدارة هنا)
    expect($created['allowed_next'])->toBe(['confirmed', 'cancelled']);

    // 2) تحديث ملاحظات فقط (بدون items) — الأسطر تبقى كما هي
    $updated = test()->withToken(test()->token)->patchJson($url.'/'.$created['id'], [
        'notes' => 'تم تغيير الملاحظة فقط',
    ])->assertOk()->json('data');
    expect($updated['notes'])->toBe('تم تغيير الملاحظة فقط')
        ->and(count($updated['lines']))->toBe(1)
        ->and((float) $updated['lines'][0]['quantity'])->toBe(2.0);

    // المسؤول يؤكد الطلب
    actingAsAuthenticatedTenantUser();
    $adminUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];
    test()->patchJson($adminUrl, ['status' => 'confirmed'])
        ->assertOk()
        ->assertJsonPath('data.allowed_next', ['processed']);

    // 3) الزبون لا يرى انتقالات الإدارة بعد التأكيد (لا processed على الإطلاق)
    portalOrderAuthGet($url.'/'.$created['id'])
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.allowed_next', []);

    // 4) الإدارة لا يمكنها استهداف الحالة القديمة pending كهدف
    // (portalOrderAuthGet أعاد البيرير توكن الزبون — نعود لجلسة الإدارة)
    actingAsAuthenticatedTenantUser();
    test()->patchJson($adminUrl, ['status' => 'pending'])
        ->assertStatus(422);
});

it('B.3: customer search by the converted FV number finds the order (scan-to-track)', function () {
    // الزبون يطلب سلعة ثم يؤكدها
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/orders';
    $created = test()->withToken(test()->token)->postJson(
        $url,
        ['items' => [['product_id' => test()->productA, 'quantity' => 2]]]
    )->assertStatus(201)->json('data');

    // إدارة: تؤكد وتُحوّل الطلب إلى فاتورة (تنتج رقم FV-… الحقيقي)
    actingAsAuthenticatedTenantUser();
    $adminOrderUrl = '/api/v1/'.TEST_COMPANY_SLUG.'/portal-orders/'.$created['id'];
    DB::table('products')->where('id', test()->productA)->update(['allow_negative_stock' => true]);
    test()->patchJson($adminOrderUrl, ['status' => 'confirmed'])->assertOk();

    $res = test()->postJson($adminOrderUrl.'/convert', ['target' => 'FV'])->assertOk()->json('data');
    $fvNumber = $res['sale']['document_number'];

    // QR الفاتورة يحمل رقم الفاتورة المحوَّلة — البحث به يجب أن يجد الطلب
    portalOrderAuthGet($url.'?search='.urlencode($fvNumber))
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.data.0.id', $created['id'])
        ->assertJsonPath('data.data.0.reference', $created['reference']);

    // البحث برقم غير موجود لا يعيد شيئاً
    portalOrderAuthGet($url.'?search='.urlencode('FV-9999-999999'))
        ->assertOk()
        ->assertJsonPath('data.meta.total', 0);
});
