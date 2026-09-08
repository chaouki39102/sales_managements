<?php

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

uses(
    TestCase::class,
    RefreshDatabase::class,
)->in('Feature');

const TEST_COMPANY_SLUG = 'test-company';
const TEST_TENANT_EMAIL = 'tenant@example.test';

function testCompanySlug(): string
{
    return Company::query()->firstOrCreate(
        ['slug' => TEST_COMPANY_SLUG],
        ['name' => 'Test Company', 'active' => true],
    )->slug;
}

function actingAsAuthenticatedTenantUser()
{
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);

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

    Sanctum::actingAs($user);

    return test();
}

function actingAsRole(string $roleName, array $permissions = [], ?int $companyId = null)
{
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->first()
        ?? Company::query()->create(['name' => 'Test Company', 'slug' => TEST_COMPANY_SLUG, 'active' => true]);
    $companyId ??= $company->id;

    foreach ($permissions as $perm) {
        Permission::query()->firstOrCreate(
            ['name' => $perm, 'guard_name' => 'web', 'company_id' => null],
            ['name' => $perm, 'guard_name' => 'web', 'company_id' => null],
        );
    }
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

    $role = Role::query()->firstOrCreate(
        ['name' => $roleName, 'guard_name' => 'web', 'company_id' => $companyId],
    );
    $role->syncPermissions($permissions);

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

    $user->assignRole($role);
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

    Sanctum::actingAs($user);

    return test();
}
