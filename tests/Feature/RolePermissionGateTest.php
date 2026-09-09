<?php

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

// ─── 1. الإعدادات ────────────────────────────────────────────────

it('1a. GET /settings — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/settings")->assertForbidden();
});

it('1b. GET /settings — مع view_settings → 200', function () {
    actingAsRole('manager-settings', ['view_settings']);
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/settings")
        ->assertOk()
        ->assertJsonStructure(['status', 'message', 'data', 'timestamp']);
});

it('2. GET /settings/group/general — مفتوح (ليس 403)', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    expect(getJson("/api/v1/{$slug}/settings/group/general")->getStatusCode())->not->toBe(403);
});

it('3a. PATCH /settings — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    patchJson("/api/v1/{$slug}/settings", [])->assertForbidden();
});

it('3b. PATCH /settings — مع manage_settings → ليس 403', function () {
    actingAsRole('manager-settings', ['manage_settings']);
    $slug = testCompanySlug();

    expect(patchJson("/api/v1/{$slug}/settings", [])->getStatusCode())->not->toBe(403);
});

// ─── 4. بوابة المسار الداخلية (update_company قبل findOrFail) ────

it('4a. POST /portal-orders/999/convert — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/portal-orders/999/convert", [])->assertForbidden();
});

it('4b. POST /portal-orders/999/convert — مع manage_portal_orders فقط → 403 (المسار يتطلب update_company داخلياً)', function () {
    actingAsRole('custom-manager', ['manage_portal_orders']);
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/portal-orders/999/convert", [])->assertForbidden();
});

it('4c. POST /portal-orders/999/convert — مع الصلاحيتين → 404 (غير موجود)', function () {
    actingAsRole('custom-manager', ['manage_portal_orders', 'update_company']);
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/portal-orders/999/convert", [])->assertNotFound();
});

// ─── 5. التقارير المفتوحة ────────────────────────────────────────

it('5. GET /reports/sales — مفتوح (ليس 403)', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    expect(getJson("/api/v1/{$slug}/reports/sales")->getStatusCode())->not->toBe(403);
});

// ─── 6–9. الأدوار وقوالب الطباعة ─────────────────────────────────

it('6. GET /roles — مفتوح → 200', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/roles")->assertOk();
});

// ─── 6d. عزل super-admin عن مستخدمي الشركة (RoleService::getListConfig) ──

it('6d1. GET /roles — مستخدم/مالك الشركة لا يرى دور super-admin العالمي', function () {
    actingAsAuthenticatedTenantUser();
    $slug    = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();

    // أنشئ دوراً عالمياً (company_id IS NULL) باسم super-admin
    Role::query()->firstOrCreate(
        ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    // حتى لو كان المستخدم مالك الشركة — يجب ألا يظهر له دور super-admin
    $user = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $company->update(['owner_id' => $user->id]);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $content = getJson("/api/v1/{$slug}/roles")->assertOk()->getContent();

    expect($content)->not->toContain('super-admin');
    expect($content)->toContain((string)$company->id); // أدوار الشركة تبقى ظاهرة
});

it('6d2. GET /roles — super-admin الحقيقي يرى الدور العالمي', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    // أنشئ دور super-admin العالمي وأسنده لمستخدم
    Role::query()->firstOrCreate(
        ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $user = User::query()->firstOrCreate(
        ['email' => TEST_TENANT_EMAIL],
        ['name' => 'Test Tenant', 'password' => 'password'],
    );
    DB::table('company_user')->updateOrInsert(
        ['company_id' => $company->id, 'user_id' => $user->id],
        [
            'role'       => 'member',
            'active'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    );

    $user->assignRole('super-admin');
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($user);

    $content = getJson("/api/v1/{$slug}/roles")->assertOk()->getContent();

    expect($content)->toContain('super-admin');
});

it('7a. PUT /roles/999 — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    putJson("/api/v1/{$slug}/roles/999", [])->assertForbidden();
});

it('7b. PUT /roles/999 — مع manage_roles → 404 (غير موجود)', function () {
    actingAsRole('custom-manager', ['manage_roles']);
    $slug = testCompanySlug();

    putJson("/api/v1/{$slug}/roles/999", [])->assertNotFound();
});

it('8. GET /print-templates — مفتوح → 200', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/print-templates")->assertOk();
});

it('9a. POST /print-templates — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/print-templates", [])->assertForbidden();
});

it('9b. POST /print-templates — مع manage_print_templates → ليس 403', function () {
    actingAsRole('custom-manager', ['manage_print_templates']);
    $slug = testCompanySlug();

    expect(postJson("/api/v1/{$slug}/print-templates", [])->getStatusCode())->not->toBe(403);
});

// ─── 10–14. المستخدمون ───────────────────────────────────────────

it('10a. GET /users — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/users")->assertForbidden();
});

it('10b. GET /users — مع view_any_user → 200', function () {
    actingAsRole('manager-users', ['view_any_user']);
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/users")->assertOk();
});

it('11a. GET /users/{id} — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();
    $userId = User::query()->where('email', TEST_TENANT_EMAIL)->first()->id;

    getJson("/api/v1/{$slug}/users/{$userId}")->assertForbidden();
});

it('11b. GET /users/{id} (معرف حقيقي) — مع view_any_user + view_user → 200', function () {
    actingAsRole('manager-users', ['view_any_user', 'view_user']);
    $slug = testCompanySlug();
    $userId = User::query()->where('email', TEST_TENANT_EMAIL)->first()->id;

    getJson("/api/v1/{$slug}/users/{$userId}")->assertOk();
});

it('11b2. GET /users/{id} — مع view_any_user فقط → 403 (المستوى الثاني يتطلب view_user)', function () {
    actingAsRole('manager-users', ['view_any_user']);
    $slug = testCompanySlug();
    $userId = User::query()->where('email', TEST_TENANT_EMAIL)->first()->id;

    getJson("/api/v1/{$slug}/users/{$userId}")->assertForbidden();
});

it('12a. POST /users — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/users", [])->assertForbidden();
});

it('12b. POST /users — مع update_company فقط → 403 (المسار يتطلب create_user)', function () {
    actingAsRole('custom-manager', ['update_company']);
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/users", [])->assertForbidden();
});

it('12c. POST /users — مع update_company + create_user → 201 (البدنه صالحة)', function () {
    actingAsRole('custom-manager', ['update_company', 'create_user']);
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/users", [
        'email'    => 'u1@example.com',
        'name'     => 'User One',
        'password' => 'secret123',
    ])->assertCreated();
});

it('13a. PUT /users/999 — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    putJson("/api/v1/{$slug}/users/999", [])->assertForbidden();
});

it('13b. PUT /users/999 — مع update_company فقط → 404 (findById أولاً)', function () {
    actingAsRole('custom-manager', ['update_company']);
    $slug = testCompanySlug();

    putJson("/api/v1/{$slug}/users/999", [])->assertNotFound();
});

it('13c. PUT /users/999 — مع update_company + update_user → 404', function () {
    actingAsRole('custom-manager', ['update_company', 'update_user']);
    $slug = testCompanySlug();

    putJson("/api/v1/{$slug}/users/999", [])->assertNotFound();
});

it('14a. POST /users/999/toggle-active — بدون صلاحية → 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/users/999/toggle-active", [])->assertForbidden();
});

it('14b. POST /users/999/toggle-active — مع manage_company_members → 404', function () {
    actingAsRole('custom-manager', ['manage_company_members']);
    $slug = testCompanySlug();

    postJson("/api/v1/{$slug}/users/999/toggle-active", [])->assertNotFound();
});

// ─── 15. نقاط أنا (مفتوحة لكل عضو) ───────────────────────────────

it('15. GET /me و /me/permissions و /me/roles — → 200', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();

    getJson("/api/v1/{$slug}/me")->assertOk();
    getJson("/api/v1/{$slug}/me/permissions")->assertOk();
    getJson("/api/v1/{$slug}/me/roles")->assertOk();
});

// ─── 16. المنح المباشر بدون دور ──────────────────────────────────

it('16. منح مباشر دون دور — view_settings يُرى في /me/permissions ويفتح /settings، وإبطاله يعيد 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();
    $user = User::query()->where('email', TEST_TENANT_EMAIL)->first();

    getJson("/api/v1/{$slug}/settings")->assertForbidden();

    $permission = Permission::query()->firstOrCreate(
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $user->givePermissionTo($permission);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    expect(getJson("/api/v1/{$slug}/me/permissions")->getContent())->toContain('view_settings');
    getJson("/api/v1/{$slug}/settings")->assertOk();

    auth('sanctum')->user()->revokePermissionTo($permission);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    expect(getJson("/api/v1/{$slug}/me/permissions")->getContent())->not->toContain('view_settings');
    getJson("/api/v1/{$slug}/settings")->assertForbidden();
});

// ─── 17. مرور المالك (بدون أي صلاحية) ────────────────────────────

it('17. المالك يتجاوز البوابة — GET /settings 200 و PATCH ليس 403', function () {
    actingAsAuthenticatedTenantUser();
    $slug = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $user    = User::query()->where('email', TEST_TENANT_EMAIL)->first();

    getJson("/api/v1/{$slug}/settings")->assertForbidden();

    $company->update(['owner_id' => $user->id]);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    getJson("/api/v1/{$slug}/settings")->assertOk();

    expect(patchJson("/api/v1/{$slug}/settings", [])->getStatusCode())->not->toBe(403);
});

// ─── 18. 6d: المنح المباشرة عبر API (permission_ids على PUT users/{id}) ──
// المسار يتطلب update_company + السياسة update_user، لذا كل سيناريو يملك
// محرِّرًا (admin) بصلاحيتين مباشرتين وهدفًا (target) يُفحص عبر /me/roles.

it('18a. PUT users/{id} — منح مباشر عبر permission_ids يظهر للهدف في /me/roles', function () {
    actingAsAuthenticatedTenantUser();
    $slug    = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $admin   = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $target  = User::query()->create(['name' => 'Target 6d', 'email' => 'target-6d@example.test', 'password' => 'password']);
    DB::table('company_user')->insert([
        'company_id'  => $company->id,
        'user_id'     => $target->id,
        'role'        => 'member',
        'active'      => true,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    $view = Permission::query()->firstOrCreate(
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
    );
    foreach (['update_company', 'update_user'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    $admin->givePermissionTo(['update_company', 'update_user']);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6d', 'permission_ids' => [$view->id]])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->toContain('view_settings');
});

it('18b. PUT users/{id} — permission_ids: [] يمسح كل المنح المباشرة', function () {
    actingAsAuthenticatedTenantUser();
    $slug    = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $admin   = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $target  = User::query()->create(['name' => 'Target 6b', 'email' => 'target-6b@example.test', 'password' => 'password']);
    DB::table('company_user')->insert([
        'company_id'  => $company->id,
        'user_id'     => $target->id,
        'role'        => 'member',
        'active'      => true,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    $view = Permission::query()->firstOrCreate(
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
    );
    foreach (['update_company', 'update_user'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    $admin->givePermissionTo(['update_company', 'update_user']);
    $target->givePermissionTo('view_settings');
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->toContain('view_settings');

    Sanctum::actingAs($admin);
    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6b', 'permission_ids' => []])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->not->toContain('view_settings');
    expect(getJson("/api/v1/{$slug}/settings")->getStatusCode())->toBe(403);
});

it('18c. PUT users/{id} — إعادة المنح بعد المسح تعمل', function () {
    actingAsAuthenticatedTenantUser();
    $slug    = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $admin   = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $target  = User::query()->create(['name' => 'Target 6c', 'email' => 'target-6c@example.test', 'password' => 'password']);
    DB::table('company_user')->insert([
        'company_id'  => $company->id,
        'user_id'     => $target->id,
        'role'        => 'member',
        'active'      => true,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    $view = Permission::query()->firstOrCreate(
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
    );
    foreach (['update_company', 'update_user'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    $admin->givePermissionTo(['update_company', 'update_user']);
    $target->givePermissionTo('view_settings');
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($admin);
    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6c', 'permission_ids' => []])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->not->toContain('view_settings');

    Sanctum::actingAs($admin);
    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6c', 'permission_ids' => [$view->id]])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->toContain('view_settings');
    getJson("/api/v1/{$slug}/settings")->assertOk();
});

it('18d. PUT users/{id} — تعديل مباشر بـ [] لا يمسح صلاحيات الدور', function () {
    actingAsAuthenticatedTenantUser();
    $slug    = testCompanySlug();
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $admin   = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $target  = User::query()->create(['name' => 'Target 6d', 'email' => 'target-6d-bis@example.test', 'password' => 'password']);
    DB::table('company_user')->insert([
        'company_id'  => $company->id,
        'user_id'     => $target->id,
        'role'        => 'member',
        'active'      => true,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    Permission::query()->firstOrCreate(
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
        ['name' => 'view_settings', 'guard_name' => 'web', 'company_id' => null],
    );
    foreach (['update_company', 'update_user'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    $admin->givePermissionTo(['update_company', 'update_user']);

    $role = Role::query()->firstOrCreate(
        ['name' => 'manager-settings', 'guard_name' => 'web', 'company_id' => $company->id],
        ['name' => 'manager-settings', 'guard_name' => 'web', 'company_id' => $company->id],
    );
    $role->syncPermissions(['view_settings']);
    $target->assignRole($role);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($admin);
    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6d', 'permission_ids' => []])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->toContain('view_settings');
    getJson("/api/v1/{$slug}/settings")->assertOk();
});

// ─── 19. حارس تصعيد الصلاحيات (assertCanAssignPermissions في RoleService) ──
// القاعدة: «لا يمكنك منح ما لا تملك» — مستخدم غير super-admin قد يمنح فقط
// الصلاحيات التي يملكها بنفسه. أي صلاحية عليا (transfer_ownership وغيرها)
// غير محمولة → BusinessRuleException 409 قبل أي كتابة.

it('19a. POST /roles — مستخدم manage_roles لا يملك صلاحية عليا → 409 (منع تصعيد)', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    // تأكد من وجود الصلاحيتين عالميتين
    foreach (['manage_roles', 'transfer_ownership'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    // مستخدم بمستوى manager يملك manage_roles فقط (ليس transfer_ownership)
    actingAsRole('custom-manager', ['manage_roles']);
    $owner = Permission::query()->where('name', 'transfer_ownership')->first();

    // محاولة إنشاء دور يمنح صلاحية عليا غير محمولة → 409
    postJson("/api/v1/{$slug}/roles", [
        'name'           => 'evil-role',
        'guard_name'     => 'web',
        'permission_ids' => [$owner->id],
    ])->assertStatus(409);
});

it('19b. POST /roles — المستخدم يملك الصلاحية التي يمنحها → 201', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    foreach (['manage_roles', 'view_roles'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $view = Permission::query()->where('name', 'view_roles')->first();

    // مدير يملك manage_roles + view_roles → يستطيع منح view_roles لطرف جديد
    actingAsRole('custom-manager', ['manage_roles', 'view_roles']);

    postJson("/api/v1/{$slug}/roles", [
        'name'           => 'safe-role',
        'guard_name'     => 'web',
        'permission_ids' => [$view->id],
    ])->assertCreated();
});

it('19c. POST /roles — super-admin يستطيع منح أي صلاحية (تجاوز الحارس)', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    foreach (['super-admin', 'manage_roles', 'transfer_ownership'] as $name) {
        if ($name === 'super-admin') {
            Role::query()->firstOrCreate(
                ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
                ['name' => 'super-admin', 'guard_name' => 'web', 'company_id' => null],
            );
            continue;
        }
        Permission::query()->firstOrCreate(
            ['name' => $name, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $name, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $user = User::query()->firstOrCreate(
        ['email' => TEST_TENANT_EMAIL],
        ['name' => 'Test Tenant', 'password' => 'password'],
    );
    DB::table('company_user')->updateOrInsert(
        ['company_id' => $company->id, 'user_id' => $user->id],
        ['role' => 'member', 'active' => true, 'created_at' => now(), 'updated_at' => now()],
    );
    $user->assignRole('super-admin');
    app(PermissionRegistrar::class)->forgetCachedPermissions();
    Sanctum::actingAs($user);

    $owner = Permission::query()->where('name', 'transfer_ownership')->first();

    postJson("/api/v1/{$slug}/roles", [
        'name'           => 'super-role',
        'guard_name'     => 'web',
        'permission_ids' => [$owner->id],
    ])->assertCreated();
});

it('19d. PUT roles/{id} — تعديل دور بصلاحية عليا غير محمولة → 409', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    foreach (['manage_roles', 'view_roles', 'manage_backup'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }

    $role = Role::query()->firstOrCreate(
        ['name' => 'victim-role', 'guard_name' => 'web', 'company_id' => $company->id],
        ['name' => 'victim-role', 'guard_name' => 'web', 'company_id' => $company->id],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    actingAsRole('custom-manager', ['manage_roles']);
    $backup = Permission::query()->where('name', 'manage_backup')->first();

    putJson("/api/v1/{$slug}/roles/{$role->id}", [
        'permission_ids' => [$backup->id],
    ])->assertStatus(409);
});

// ─── 20. تفرد اسم الدور لكل شركة (company-scoped) ─────────────────

it('20a. POST /roles — اسم مكرر داخل نفس الشركة → 422', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $slug = $company->slug;

    Role::query()->firstOrCreate(
        ['name' => 'dup-role', 'guard_name' => 'web', 'company_id' => $company->id],
        ['name' => 'dup-role', 'guard_name' => 'web', 'company_id' => $company->id],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    actingAsRole('custom-manager', ['manage_roles']);

    postJson("/api/v1/{$slug}/roles", [
        'name'       => 'dup-role',
        'guard_name' => 'web',
    ])->assertStatus(422);
});

it('20b. POST /roles — نفس الاسم في شركة أخرى مسموح (متعدد المستأجرين)', function () {
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $other = Company::query()->create(['name' => 'Other Co', 'slug' => 'other-company-unique', 'active' => true]);
    $slug = $company->slug;

    // في الشركة الأخرى يوجد اسم same-role
    Role::query()->firstOrCreate(
        ['name' => 'same-role', 'guard_name' => 'web', 'company_id' => $other->id],
        ['name' => 'same-role', 'guard_name' => 'web', 'company_id' => $other->id],
    );
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    actingAsRole('custom-manager', ['manage_roles']);

    // نفس الاسم مسموح في شركتنا (لم يُخلق هنا)
    postJson("/api/v1/{$slug}/roles", [
        'name'       => 'same-role',
        'guard_name' => 'web',
    ])->assertCreated();
});

it('18e. PUT users/{id} — صلاحية من شركة أخرى تُفلتَر بصمت ولا تُمنح', function () {
    actingAsAuthenticatedTenantUser();
    $slug         = testCompanySlug();
    $company      = Company::query()->where('slug', TEST_COMPANY_SLUG)->first();
    $admin        = User::query()->where('email', TEST_TENANT_EMAIL)->first();
    $target       = User::query()->create(['name' => 'Target 6e', 'email' => 'target-6e@example.test', 'password' => 'password']);
    $otherCompany = Company::query()->create(['name' => 'Other Co', 'slug' => 'other-company-6d', 'active' => true]);
    DB::table('company_user')->insert([
        'company_id'  => $company->id,
        'user_id'     => $target->id,
        'role'        => 'member',
        'active'      => true,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    $foreign = Permission::query()->create([
        'name'       => 'secret_other',
        'guard_name' => 'web',
        'company_id' => $otherCompany->id,
    ]);
    foreach (['update_company', 'update_user'] as $permName) {
        Permission::query()->firstOrCreate(
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $permName, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    $admin->givePermissionTo(['update_company', 'update_user']);
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($admin);
    putJson("/api/v1/{$slug}/users/{$target->id}", ['name' => 'Target 6e', 'permission_ids' => [$foreign->id]])->assertOk();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    $target->unsetRelation('permissions');
    expect($target->getDirectPermissions()->pluck('name'))->not->toContain('secret_other');

    Sanctum::actingAs($target);
    expect(getJson("/api/v1/{$slug}/me/roles")->getContent())->not->toContain('secret_other');
});