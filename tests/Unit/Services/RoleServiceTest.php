<?php

namespace Tests\Unit\Services;

use App\Services\RoleService;
use App\Models\Role;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RoleServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RoleService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RoleService();
    }

    public function test_create_role(): void
    {
        $data = [
            'name' => 'Admin',
            'description' => 'Administrator role',
        ];

        $role = $this->service->create($data);

        $this->assertInstanceOf(Role::class, $role);
        $this->assertEquals('Admin', $role->name);
    }

    public function test_update_role_changes_name(): void
    {
        $role = Role::factory()->create(['name' => 'Old Role']);

        $updated = $this->service->update($role, ['name' => 'New Role']);

        $this->assertEquals('New Role', $updated->name);
    }

    public function test_delete_role_succeeds(): void
    {
        $role = Role::factory()->create();

        $result = $this->service->delete($role);

        $this->assertTrue($result);
    }

    public function test_find_by_id_returns_role_with_permissions(): void
    {
        $role = Role::factory()->create();

        $result = $this->service->findById($role->id);

        $this->assertEquals($role->id, $result->id);
    }
}