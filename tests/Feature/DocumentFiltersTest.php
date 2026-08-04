<?php

/**
 * إعادة تحقّق شامل من جميع فلاتر DataTable المستندات (عدد من "some filters in datatable not worked")
 *
 * يغطي كل عمود قابل للفلترة في صفحة المستندات مع الفورمات الذي يرسله الواجهة فعلياً:
 *   - text  → filter[document_number] / filter[reference] / filter[notes] / filter[payment_terms]
 *   - select (1/0) → filter[is_locked]
 *   - date  → filter[<date_field>]=min,max   (document_date / due_date / delivery_date / validated_at / created_at / updated_at)
 *   - number → filter[<num_field>]=min,max    (total_ht / total_tva / total_ttc / net_to_pay / paid_amount / total_discount / total_stamp / remaining_amount)
 *   - dynamic-multiselect (CSV) → filter[party.name] / filter[warehouse.name] / filter[validatedBy.name] / filter[user.name]
 *   - select STATUS → filter[document_status.name]=<name>  (أسماء document_statuses مطابقة لمفاتيح STATUS_CFG)
 *   - search عام → filter[search]
 *   - context → filter[document_type_id]
 */

use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $now = now();

    $companyId = DB::table('companies')->insertGetId([
        'name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $u1 = User::query()->create(['name' => 'Owner Admin', 'email' => TEST_TENANT_EMAIL, 'password' => 'password'])->id;
    $u2 = User::query()->create(['name' => 'Creator User', 'email' => 'creator@example.test', 'password' => 'password'])->id;

    foreach ([$u1, $u2] as $uid) {
        DB::table('company_user')->insert([
            'company_id' => $companyId, 'user_id' => $uid,
            'role' => 'member', 'active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    // المالك → Gate::before يتجاوز فحص الصلاحيات
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

    $dtId = DB::table('document_types')->insertGetId([
        'company_id' => $companyId, 'name' => 'فاتورة بيع', 'name_latin' => 'Invoice', 'code' => 'FV',
        'document_base_operation_id' => $opId,
        'affects_stock_direction' => -1, 'requires_party' => true,
        'affects_accounting' => true, 'is_printable' => true, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $whA = DB::table('warehouses')->insertGetId([
        'company_id' => $companyId, 'name' => 'مستودع رئيسي', 'code' => 'WH1', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $whB = DB::table('warehouses')->insertGetId([
        'company_id' => $companyId, 'name' => 'مستودع فرعي', 'code' => 'WH2', 'active' => true,
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

    $pA = DB::table('parties')->insertGetId([
        'company_id' => $companyId, 'party_type_id' => $ptId,
        'name' => 'زبون ألف', 'slug' => 'client-a',
        'credit_limit' => 0, 'is_tva_exempt' => false, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $pB = DB::table('parties')->insertGetId([
        'company_id' => $companyId, 'party_type_id' => $ptId,
        'name' => 'زبون باء', 'slug' => 'client-b',
        'credit_limit' => 0, 'is_tva_exempt' => false, 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $stDraft = DB::table('document_statuses')->insertGetId([
        'company_id' => $companyId, 'name' => 'draft', 'label' => 'مسودة', 'color' => 'gray', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);
    $stPaid = DB::table('document_statuses')->insertGetId([
        'company_id' => $companyId, 'name' => 'paid', 'label' => 'مدفوع', 'color' => 'green', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $nsId = DB::table('numbering_series')->insertGetId([
        'company_id' => $companyId, 'document_type_id' => $dtId, 'warehouse_id' => $whA,
        'prefix' => 'FV', 'format' => '{prefix}-{year}-%06d', 'last_number' => 0,
        'padding' => 6, 'start_number' => 1, 'reset_yearly' => true,
        'active' => true, 'is_locked' => false,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $base = [
        'company_id' => $companyId, 'document_type_id' => $dtId, 'numbering_series_id' => $nsId,
        'warehouse_id' => $whA, 'fiscal_year_id' => $fyId, 'currency_id' => $curId,
        'exchange_rate' => 1.0, 'total_tva' => 0, 'total_stamp' => 0,
        'is_exported_to_accounting' => false,
    ];
    $doc = function (array $overrides) use ($base, $now) {
        DB::table('commercial_documents')->insert(array_merge($base, [
            'document_number' => 'X', 'user_id' => null, 'party_id' => null,
            'document_date' => $now, 'total_ht' => 0, 'total_ttc' => 0, 'net_to_pay' => 0,
            'paid_amount' => 0, 'remaining_amount' => 0, 'is_locked' => false,
            'created_at' => $now, 'updated_at' => $now,
        ], $overrides));
    };

    $doc([
        'document_number' => 'FV-1', 'user_id' => $u1, 'party_id' => $pA,
        'document_status_id' => $stDraft,
        'document_date' => '2026-07-15 00:00:00', 'due_date' => null, 'delivery_date' => null,
        'total_ht' => 1000, 'total_tva' => 190, 'total_ttc' => 1190, 'net_to_pay' => 1190,
        'paid_amount' => 0, 'remaining_amount' => 1190, 'total_discount' => 0,
        'is_locked' => true, 'reference' => 'REF-001', 'notes' => 'ملاحظة خاصة ألف', 'payment_terms' => 'نقداً',
        'validated_at' => null, 'validated_by' => null,
        'created_at' => '2026-07-15 08:00:00',
    ]);
    $doc([
        'document_number' => 'FV-2', 'user_id' => $u2, 'party_id' => $pB, 'warehouse_id' => $whB,
        'document_status_id' => $stPaid,
        'document_date' => '2026-07-31 00:00:00', 'due_date' => '2026-08-15 00:00:00', 'delivery_date' => '2026-07-20 00:00:00',
        'total_ht' => 2000, 'total_tva' => 380, 'total_ttc' => 2380, 'net_to_pay' => 2380,
        'paid_amount' => 2380, 'remaining_amount' => 0, 'total_discount' => 100, 'total_stamp' => 50,
        'is_locked' => false, 'reference' => 'REF-002', 'notes' => 'ملاحظة خاصة باء', 'payment_terms' => 'أجل 30',
        'validated_at' => '2026-07-31 12:00:00', 'validated_by' => $u1,
        'created_at' => '2026-07-31 08:00:00',
    ]);
    $doc([
        'document_number' => 'FV-3', 'user_id' => $u1, 'party_id' => $pA,
        'document_status_id' => $stPaid,
        'document_date' => '2026-08-01 00:00:00', 'due_date' => null, 'delivery_date' => null,
        'total_ht' => 500, 'total_tva' => 95, 'total_ttc' => 595, 'net_to_pay' => 595,
        'paid_amount' => 595, 'remaining_amount' => 0, 'total_discount' => 0,
        'is_locked' => false, 'reference' => 'BLUE-9', 'notes' => 'بدون', 'payment_terms' => null,
        'validated_at' => '2026-08-01 09:00:00', 'validated_by' => $u2,
        'created_at' => '2026-08-01 08:00:00',
    ]);

    
});

// بناء رابط الفلترة بنفس صيغة الواجهة (القيم تُرمَّز، المفاتيح تبقى raw)
function docFilterUrl(string $key, string $value): string
{
    return '/api/v1/'.TEST_COMPANY_SLUG.'/documents?per_page=50&filter['.$key.']='.rawurlencode($value);
}

it('baseline returns all documents', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/documents?per_page=50')
        ->assertOk()
        ->assertJsonPath('meta.total', 3);
});

it('text filter on document_number', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson(docFilterUrl('document_number', 'FV-1'))
        ->assertOk()->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.document_number', 'FV-1');
});

it('select filter on is_locked (1 / 0)', function () {
    actingAsAuthenticatedTenantUser()
        ->getJson(docFilterUrl('is_locked', '1'))
        ->assertOk()->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.document_number', 'FV-1');
    actingAsAuthenticatedTenantUser()
        ->getJson(docFilterUrl('is_locked', '0'))
        ->assertOk()->assertJsonPath('meta.total', 2);
});

it('date filters on document_date / due_date / delivery_date', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('document_date', '2026-07-31,2026-07-31'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('document_date', '2026-07-15,2026-07-31'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('due_date', '2026-08-15,2026-08-15'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('delivery_date', '2026-07-20,2026-07-20'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('datetime filters on validated_at / created_at / updated_at', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('validated_at', '2026-07-31,2026-07-31'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('validated_at', '2026-08-01,2026-08-01'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('created_at', '2026-07-31,2026-07-31'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('updated_at', '2026-08-01,2026-08-01'))->assertOk()->assertJsonPath('meta.total', 0);
});

it('numeric filters on amounts', function () {
    $t = actingAsAuthenticatedTenantUser();
    // نطاق مغلق
    $t->getJson(docFilterUrl('total_ht', '1000,2000'))->assertOk()->assertJsonPath('meta.total', 2);
    // min فقط
    $t->getJson(docFilterUrl('total_ttc', '2380,'))->assertOk()->assertJsonPath('meta.total', 1);
    // max فقط
    $t->getJson(docFilterUrl('total_ttc', ',595'))->assertOk()->assertJsonPath('meta.total', 1);
    // day واحد (min == max)
    $t->getJson(docFilterUrl('paid_amount', '2380,2380'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('total_discount', '100,100'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('total_stamp', '50,50'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('remaining_amount', '0,0'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('net_to_pay', '595,595'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('relation multiselect filters (party.name / warehouse.name)', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('party.name', 'زبون ألف'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('party.name', 'زبون باء'))->assertOk()->assertJsonPath('meta.total', 1);
    // CSV (اختيار متعدد)
    $t->getJson(docFilterUrl('party.name', 'زبون ألف,زبون باء'))->assertOk()->assertJsonPath('meta.total', 3);
    $t->getJson(docFilterUrl('warehouse.name', 'مستودع فرعي'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('status select filter (document_status.name matches STATUS keys)', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('document_status.name', 'draft'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('document_status.name', 'paid'))->assertOk()->assertJsonPath('meta.total', 2);
});

it('user relation filters (created_by → user.name / validated_by → validatedBy.name)', function () {
    $t = actingAsAuthenticatedTenantUser();
    // created_by = user_id
    $t->getJson(docFilterUrl('user.name', 'Creator User'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('user.name', 'Owner Admin'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('validatedBy.name', 'Owner Admin'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('validatedBy.name', 'Creator User'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('text filters on reference / notes / payment_terms', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('reference', 'REF-002'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('notes', 'ملاحظة خاصة'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('payment_terms', 'أجل'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('global search (filter[search]) matches document_number / reference / notes', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('search', 'BLUE'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', 'FV-2'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', 'ملاحظة خاصة'))->assertOk()->assertJsonPath('meta.total', 2);
});

it('global search (filter[search]) matches party name / warehouse / creator', function () {
    $t = actingAsAuthenticatedTenantUser();
    $t->getJson(docFilterUrl('search', 'زبون ألف'))->assertOk()->assertJsonPath('meta.total', 2);
    $t->getJson(docFilterUrl('search', 'زبون باء'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', 'مستودع فرعي'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', 'Creator User'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', 'غريب'))->assertOk()->assertJsonPath('meta.total', 0);
});

it('global search (filter[search]) matches amounts when the query is numeric', function () {
    $t = actingAsAuthenticatedTenantUser();
    // total_ht = 2000 (FV-2) — لا يطابق أي رقم مستند/مرجع
    $t->getJson(docFilterUrl('search', '2000'))->assertOk()->assertJsonPath('meta.total', 1);
    $t->getJson(docFilterUrl('search', '2000'))->assertJsonPath('data.0.document_number', 'FV-2');
    // total_ttc / net_to_pay = 1190 (FV-1)
    $t->getJson(docFilterUrl('search', '1190'))->assertOk()->assertJsonPath('meta.total', 1);
    // جزء من مبلغ (238 → 2380)
    $t->getJson(docFilterUrl('search', '238'))->assertOk()->assertJsonPath('meta.total', 1);
});

it('context filter on document_type_id', function () {
    $dtId = DB::table('document_types')->where('company_id', DB::table('companies')->where('slug', TEST_COMPANY_SLUG)->value('id'))->where('code', 'FV')->value('id');
    actingAsAuthenticatedTenantUser()
        ->getJson(docFilterUrl('document_type_id', (string) $dtId))
        ->assertOk()->assertJsonPath('meta.total', 3);
});
