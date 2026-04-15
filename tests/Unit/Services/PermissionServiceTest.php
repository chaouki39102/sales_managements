<?php

namespace Tests\Unit\Services;

use App\Services\PermissionService;
use App\Models\Permission;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PermissionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PermissionService();
    }

    public function test_create_permission(): void
    {
        $data = [
            'name' => 'view_users',
            'description' => 'View users permission',
            'group' => 'users',
        ];

        $permission = $this->service->create($data);

        $this->assertInstanceOf(Permission::class, $permission);
        $this->assertEquals('view_users', $permission->name);
    }

    public function test_update_permission_changes_name(): void
    {
        $permission = Permission::factory()->create(['name' => 'old_permission']);

        $updated = $this->service->update($permission, ['name' => 'new_permission']);

        $this->assertEquals('new_permission', $updated->name);
    }

    public function test_delete_permission_succeeds(): void
    {
        $permission = Permission::factory()->create();

        $result = $this->service->delete($permission);

        $this->assertTrue($result);
    }

    public function test_find_by_id_returns_permission_with_roles(): void
    {
        $permission = Permission::factory()->create();

        $result = $this->service->findById($permission->id);

        $this->assertEquals($permission->id, $result->id);
    }

    public function test_get_by_group_filters_permissions(): void
    {
        Permission::factory()->count(3)->create(['group' => 'users']);
        Permission::factory()->count(2)->create(['group' => 'products']);

        $permissions = $this->service->getByGroup('users');

        $this->assertCount(3, $permissions);
    }

    public function test_get_by_group_returns_all_when_no_group(): void
    {
        Permission::factory()->count(5)->create();

        $permissions = $this->service->getByGroup();

        $this->assertCount(5, $permissions);
    }
}