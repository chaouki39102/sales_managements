<?php

/**
 * إصلاح فلتر التاريخ في DataTable المستندات (رقم 1 من "some filters in datatable not worked")
 *
 * المشكلة: عمود document_date يُخزَّن بصيغة 'YYYY-MM-DD HH:MM:SS' حتى والعمود من نوع date.
 *   - الفلتر ليوم واحد (min == max) كان يستخدم where($field, 'YYYY-MM-DD') → لا يطابق
 *     'YYYY-MM-DD 00:00:00' أبداً → يرجع 0 صفوف (الجدول يظهر فارغاً).
 *   - حد أقصى للنطاق كان where($field, '<=', 'YYYY-MM-DD') → مقارنة نصية تحذف
 *     مستندات يوم الحد الأقصى (مثال: '<= 2026-07-31' لا يطابق '2026-07-31 00:00:00').
 *
 * الإصلاح: الحدود دائماً تُحوَّل إلى 00:00:00 / 23:59:59 (تعمل على MySQL DATE و SQLite).
 *
 * هذه الاختبارات تُثبّت الصفوف بنص 'Y-m-d H:i:s' (نفس ما يخزّنه الـ Service) حتى
 * يبقى الاختبار كاشفاً لانحدار هذا الباغ.
 *
 * ملاحظة: ننشئ الشركة عبر DB::table لتفادي CompanyObserver → CompanySeeder
 * (البذر في بيئة الاختبار يتوقف لأن عمود parties.initial_balance حُذف في
 *  migration 2026_06_14_000001 — فلا نعتمد عليه إطلاقاً).
 */

use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $now = now();

    // تجاوز الـ Observer: لا بذر تلقائي، تحكّم كامل في البيانات
    $companyId = DB::table('companies')->insertGetId([
        'name'       => 'Test Company',
        'slug'       => TEST_COMPANY_SLUG,
        'active'     => true,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $userId = User::query()->create([
        'name'     => 'Test Tenant',
        'email'    => TEST_TENANT_EMAIL,
        'password' => 'password',
    ])->id;

    DB::table('company_user')->insert([
        'company_id' => $companyId,
        'user_id'    => $userId,
        'role'       => 'member',
        'active'     => true,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    // المالك → Gate::before يتجاوز فحص الصلاحيات (can:create_sales_document ...)
    DB::table('companies')->where('id', $companyId)->update(['owner_id' => $userId]);

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

    $dtId = DB::table('document_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'فاتورة بيع', 'name_latin' => 'Invoice', 'code' => 'FV',
        'document_base_operation_id' => $opId,
        'affects_stock_direction' => -1, 'requires_party' => true,
        'affects_accounting' => true, 'is_printable' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $whId = DB::table('warehouses')->insertGetId([
        'company_id' => $companyId, 'name' => 'المستودع الرئيسي', 'code' => 'WH', 'active' => true,
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

    // بدون initial_balance — العمود حُذف في migration 2026_06_14_000001
    $partyId = DB::table('parties')->insertGetId([
        'company_id'    => $companyId,
        'party_type_id' => $ptId,
        'name'          => 'زبون تجريبي',
        'slug'          => 'client-test',
        'credit_limit'  => 0,
        'is_tva_exempt' => false,
        'active'        => true,
        'created_at'    => $now,
        'updated_at'    => $now,
    ]);

    $nsId = DB::table('numbering_series')->insertGetId([
        'company_id'       => $companyId,
        'document_type_id' => $dtId,
        'warehouse_id'     => $whId,
        'prefix'           => 'FV',
        'format'           => '{prefix}-{year}-%06d',
        'last_number'      => 0,
        'padding'          => 6,
        'start_number'     => 1,
        'reset_yearly'     => true,
        'active'           => true,
        'is_locked'        => false,
        'created_at'       => $now,
        'updated_at'       => $now,
    ]);

    $makeDoc = function (string $number, string $date) use ($companyId, $userId, $dtId, $nsId, $whId, $fyId, $curId, $partyId, $now) {
        DB::table('commercial_documents')->insert([
            'company_id'          => $companyId,
            'document_type_id'    => $dtId,
            'numbering_series_id' => $nsId,
            'document_number'     => $number,
            'user_id'             => $userId,
            'party_id'            => $partyId,
            'warehouse_id'        => $whId,
            'fiscal_year_id'      => $fyId,
            'currency_id'         => $curId,
            'exchange_rate'       => 1.0,
            'document_date'       => $date, // نص 'Y-m-d H:i:s' — مطابق لما يخزّنه الـ Service
            'total_ht'            => 1000, 'total_tva' => 190, 'total_discount' => 0,
            'total_stamp'         => 0, 'total_ttc' => 1190, 'net_to_pay' => 1190,
            'paid_amount'         => 0, 'remaining_amount' => 1190,
            'is_locked'           => false,
            'created_at'          => $now, 'updated_at' => $now,
        ]);
    };

    $makeDoc('FV-1', '2026-07-15 00:00:00');
    $makeDoc('FV-2', '2026-07-31 00:00:00'); // على يوم الحد الأقصى
    $makeDoc('FV-3', '2026-08-01 00:00:00');
});

it('date filter single-day (min == max) returns documents stored with time on that day', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/documents?filter[document_date]=2026-07-31,2026-07-31&per_page=50')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.document_number', 'FV-2');
});

it('date filter range includes documents on the max date', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/documents?filter[document_date]=2026-07-15,2026-07-31&per_page=50')
        ->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonCount(2, 'data');
});

it('date filter min-only returns documents from that day onward', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/documents?filter[document_date]=2026-07-31,&per_page=50')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);
});

it('date filter max-only returns documents up to that day', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/documents?filter[document_date]=,2026-07-31&per_page=50')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);
});
