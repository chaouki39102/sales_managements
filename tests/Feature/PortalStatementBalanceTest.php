<?php

/**
 * Regression: كشف حساب بوابة الزبائن يجب أن يتطابق مع رصيد اللوحة (Dashboard).
 *
 * القصة: المستخدم أبلغ أن «الرصيد الحالي» في اللوحة = 0 بينما كشف الحساب يعرض
 * مبلغاً مختلفاً. السبب الجذري: كشف الحساب كان يجلب صفوفاً من مستندات لا تؤثر
 * في المحاسبة (BL حيث affects_accounting=0) ومن سنوات مالية خاطئة، بينما
 * getBalanceAt() (مصدر اللوحة الوحيد) يُقيّد بكلاهما.
 *
 * هذا الاختبار يثبّت:
 *   - closing كشف الحساب == current_balance اللوحة == getBalanceAt(to).
 *   - مستند BL (غير محاسبي) لا يظهر في صفوف كشف الحساب ولا يؤثر في الرصيد.
 *   - الرصيد الجاري (running) للصف الأخير يطابق الرصيد الختامي.
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

    // FV محاسبية + BL غير محاسبية (نفس نوع العملية sale)
    $fvId = DB::table('document_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'فاتورة بيع', 'name_latin' => 'Invoice', 'code' => 'FV',
        'document_base_operation_id' => $opId,
        'affects_stock_direction' => -1, 'requires_party' => true,
        'affects_accounting' => true, 'is_printable' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $blId = DB::table('document_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'وصل تسليم', 'name_latin' => 'Delivery Note', 'code' => 'BL',
        'document_base_operation_id' => $opId,
        'affects_stock_direction' => -1, 'requires_party' => true,
        'affects_accounting' => false, 'is_printable' => true, 'active' => true,
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

    $stPaid = DB::table('document_statuses')->insertGetId([
        'company_id' => $companyId, 'name' => 'paid', 'label' => 'مدفوع', 'color' => 'green', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $nsId = DB::table('numbering_series')->insertGetId([
        'company_id' => $companyId, 'document_type_id' => $fvId, 'warehouse_id' => $whId,
        'prefix' => 'FV', 'format' => '{prefix}-{year}-%06d', 'last_number' => 0,
        'padding' => 6, 'start_number' => 1, 'reset_yearly' => true,
        'active' => true, 'is_locked' => false,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $taTypeId = DB::table('treasury_account_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'نقدي', 'label' => 'نقدي', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $taId = DB::table('treasury_accounts')->insertGetId([
        'company_id' => $companyId, 'name' => 'صندوق', 'code' => 'CA',
        'treasury_account_type_id' => $taTypeId, 'currency_id' => $curId,
        'current_balance' => 0,
        'is_default' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $pmId = DB::table('payment_modes')->insertGetId([
        'company_id' => $companyId, 'name' => 'نقداً', 'code' => 'CASH',
        'treasury_account_id' => $taId, 'is_cash' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    // ── المستندات والدفعات ────────────────────────────────────────────────
    $base = [
        'company_id' => $companyId, 'numbering_series_id' => $nsId,
        'warehouse_id' => $whId, 'fiscal_year_id' => $fyId, 'currency_id' => $curId,
        'exchange_rate' => 1.0, 'total_tva' => 0, 'total_stamp' => 0,
        'is_exported_to_accounting' => false,
        'user_id' => $u1, 'party_id' => $partyId,
        'document_status_id' => $stPaid,
        'paid_amount' => 0, 'is_locked' => false,
        'created_at' => $now, 'updated_at' => $now,
    ];
    $doc = function (array $overrides) use ($base) {
        DB::table('commercial_documents')->insert(array_merge($base, [
            'document_number' => 'X', 'document_date' => '2026-07-01 00:00:00',
            'total_ht' => 0, 'total_ttc' => 0, 'net_to_pay' => 0,
            'remaining_amount' => 0, 'total_discount' => 0,
        ], $overrides));
    };

    // FV محاسبية: net 1000 → يزيد رصيد الزبون (مدين لنا)
    $doc([
        'document_type_id' => $fvId, 'document_number' => 'FV-000001',
        'document_date' => '2026-07-15 00:00:00',
        'total_ht' => 840.34, 'total_ttc' => 1000, 'net_to_pay' => 1000,
        'paid_amount' => 0, 'remaining_amount' => 1000,
    ]);

    // BL غير محاسبية: net 5000 → يجب ألا تظهر في كشف الحساب ولا تؤثر في الرصيد
    $doc([
        'document_type_id' => $blId, 'document_number' => 'BL-000001',
        'document_date' => '2026-07-16 00:00:00',
        'total_ht' => 5000, 'total_ttc' => 5000, 'net_to_pay' => 5000,
        'paid_amount' => 0, 'remaining_amount' => 5000,
    ]);

    // دفعة مؤكدة واردة 400 → تُخصم من الرصيد
    DB::table('payments')->insert([
        'company_id' => $companyId, 'payment_number' => 'PAY-000001',
        'payment_date' => '2026-07-17', 'amount' => 400,
        'currency_id' => $curId, 'amount_local' => 400,
        'payment_mode_id' => $pmId, 'treasury_account_id' => $taId,
        'party_id' => $partyId, 'fiscal_year_id' => $fyId,
        'status' => 'confirmed', 'is_reconciled' => false,
        'user_id' => $u1, 'created_by' => $u1,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $portal = PortalUser::query()->create([
        'company_id' => $companyId, 'party_id' => $partyId,
        'name' => 'زبون البوابة', 'email' => 'portal@example.test',
        'password' => 'password', 'is_active' => true,
    ]);

    // تخزين معرفات الاستخدام داخل الدالة (سياق Pest)
    $this->partyId = $partyId;
    $this->companyId = $companyId;
    $this->token = $portal->createToken('test')->plainTextToken;
});

function portalAuthGet(string $url)
{
    $token = test()->token;
    return test()->withToken($token)->getJson($url);
}

it('statement closing matches dashboard current_balance (BL excluded, both = getBalanceAt)', function () {
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/statement?from=2026-07-01&to=2026-07-31';

    $statement = portalAuthGet($url)
        ->assertOk()
        ->assertJsonPath('data.opening', 0)
        ->assertJsonPath('data.closing', 600);

    $rows = $statement->json('data.rows');
    expect($rows)->toHaveCount(2); // FV + دفعة — لا يوجد BL

    $types = array_column($rows, 'type');
    expect($types)->not->toContain('BL');

    // الصف الأخير (الدفعة) → الرصيد الجاري = الرصيد الختامي
    $last = end($rows);
    expect((float) $last['balance'])->toBe(600.0);

    // اللوحة تعرض نفس الرقم
    $dashboard = portalAuthGet('/api/v1/'.TEST_COMPANY_SLUG.'/portal/dashboard?date=2026-07-31')
        ->assertOk();

    expect((float) $dashboard->json('data.balance.current_balance'))->toBe(600.0);
});

it('reopening a wider range keeps closing consistent with getBalanceAt', function () {
    // منتصف يوليو → نهاية أغسطس: يجب أن يتطابق الختام مع getBalanceAt(2026-08-31)
    $url = '/api/v1/'.TEST_COMPANY_SLUG.'/portal/statement?from=2026-07-15&to=2026-08-31';

    $response = portalAuthGet($url)->assertOk();

    expect((float) $response->json('data.opening'))->toBe(0.0);
    expect((float) $response->json('data.closing'))->toBe(600.0);
});
