<?php

use App\Models\Company;
use App\Models\Permission;
use App\Models\User;
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