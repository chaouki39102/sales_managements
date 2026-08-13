<?php

/**
 * PosSessionPresenceTest
 * ══════════════════════════════════════════════════════════════════
 * حضور جلسات الـ POS (نبضة القلب + مراقبة الجلسات المباشرة):
 *  1. نبضة قلب بنشاط → تحدّث last_seen_at و last_active_at وتُعلِم الجلسة "متصلة".
 *  2. نبضة بدون نشاط → تحدّث last_seen_at فقط وتُبقي last_active_at كما هو.
 *  3. جلسة قديمة النبضة (> 90 ثانية) → is_online = false.
 *  4. جلسة مغلقة → لا تكون متصلة أبداً.
 *  5. فهرس الجلسات و current() يعرّضا حقول الحضور (is_online / work_minutes / idle_minutes).
 *
 * ملاحظة: ننشئ البيانات عبر DB::table لتفادي CompanyObserver → CompanySeeder
 * (نفس نمط DocumentDateFilterTest — لا نعتمد على بذر الشركة في بيئة الاختبار).
 */

use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $now = now();

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

    DB::table('companies')->where('id', $companyId)->update(['owner_id' => $userId]);

    $whId = DB::table('warehouses')->insertGetId([
        'company_id' => $companyId, 'name' => 'المستودع الرئيسي', 'code' => 'WH', 'active' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $fyId = DB::table('fiscal_years')->insertGetId([
        'company_id' => $companyId, 'name' => 'FY 2026',
        'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
        'is_closed' => false, 'is_current' => true,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    $this->companyId = $companyId;
    $this->userId    = $userId;
    $this->warehouseId = $whId;
    $this->fiscalYearId = $fyId;
});

function makeSession(array $overrides = []): int
{
    $defaults = [
        'company_id'     => test()->companyId,
        'user_id'        => test()->userId,
        'warehouse_id'   => test()->warehouseId,
        'fiscal_year_id' => test()->fiscalYearId,
        'opened_at'      => now()->subHours(2),
        'status'         => 'open',
        'opening_cash'   => 0,
        'created_at'     => now(),
        'updated_at'     => now(),
    ];

    return DB::table('pos_sessions')->insertGetId(array_merge($defaults, $overrides));
}

it('heartbeat with activity updates last_seen_at + last_active_at and marks the session online', function () {
    $oldSeen = now()->subMinutes(5);
    $id = makeSession(['last_seen_at' => $oldSeen, 'last_active_at' => null]);

    actingAsAuthenticatedTenantUser()
        ->postJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions/'.$id.'/heartbeat', ['active' => true])
        ->assertOk()
        ->assertJsonPath('data.is_online', true)
        ->assertJsonPath('data.session_id', $id);

    $row = DB::table('pos_sessions')->where('id', $id)->first();
    expect($row->last_seen_at)->not->toBe($oldSeen->toDateTimeString())
        ->and($row->last_active_at)->not->toBeNull();
});

it('heartbeat without activity only bumps last_seen_at and keeps last_active_at', function () {
    $oldActive = now()->subMinutes(20);
    $id = makeSession([
        'last_seen_at'   => now()->subMinutes(5),
        'last_active_at' => $oldActive,
    ]);

    actingAsAuthenticatedTenantUser()
        ->postJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions/'.$id.'/heartbeat', ['active' => false])
        ->assertOk();

    $row = DB::table('pos_sessions')->where('id', $id)->first();
    expect($row->last_seen_at)->not->toBeNull()
        ->and($row->last_active_at)->toBe($oldActive->toDateTimeString());
});

it('a session whose heartbeat is older than the window is not online', function () {
    $id = makeSession(['last_seen_at' => now()->subMinutes(5)]);

    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions/current')
        ->assertOk()
        ->assertJsonPath('data.id', $id)
        ->assertJsonPath('data.is_online', false);
});

it('a closed session is never online even with a fresh heartbeat', function () {
    $id = makeSession([
        'last_seen_at'   => now(),
        'last_active_at' => now(),
        'closed_at'      => now()->subMinutes(1),
        'status'         => 'closed',
    ]);

    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions/current')
        ->assertOk()
        ->assertJsonPath('data', null);

    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions/'.$id)
        ->assertOk()
        ->assertJsonPath('data.is_online', false);
});

it('sessions index exposes presence fields for the monitor page', function () {
    makeSession([
        'last_seen_at'   => now(),
        'last_active_at' => now()->subMinutes(30),
    ]);

    actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.TEST_COMPANY_SLUG.'/pos-sessions?per_page=20')
        ->assertOk()
        ->assertJsonPath('data.0.is_online', true)
        ->assertJsonStructure([
            'data' => [['is_online', 'work_minutes', 'idle_minutes', 'last_seen_at', 'last_active_at', 'duration']],
        ])
        ->assertJsonPath('data.0.work_minutes', fn (int $m) => $m >= 119 && $m <= 121)
        ->assertJsonPath('data.0.idle_minutes', fn (int $m) => $m >= 29 && $m <= 31);
});
