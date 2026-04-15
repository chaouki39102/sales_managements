<?php

namespace Tests\Unit\Services;

use App\Services\WarehouseService;
use App\Models\Warehouse;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WarehouseServiceTest extends TestCase
{
    use RefreshDatabase;

    protected WarehouseService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WarehouseService();
    }

    public function test_create_warehouse_generates_code(): void
    {
        $data = [
            'name' => 'Main Warehouse',
            'address' => '123 Main Street',
        ];

        $warehouse = $this->service->create($data);

        $this->assertInstanceOf(Warehouse::class, $warehouse);
        $this->assertNotNull($warehouse->code);
        $this->assertStringStartsWith('WH', $warehouse->code);
    }

    public function test_create_warehouse_with_custom_code(): void
    {
        $data = [
            'name' => 'Main Warehouse',
            'code' => 'WH-001',
        ];

        $warehouse = $this->service->create($data);

        $this->assertEquals('WH-001', $warehouse->code);
    }

    public function test_update_warehouse_changes_name(): void
    {
        $warehouse = Warehouse::factory()->create(['name' => 'Old Name']);

        $updated = $this->service->update($warehouse, ['name' => 'New Warehouse']);

        $this->assertEquals('New Warehouse', $updated->name);
    }

    public function test_delete_warehouse_succeeds(): void
    {
        $warehouse = Warehouse::factory()->create();

        $result = $this->service->delete($warehouse);

        $this->assertTrue($result);
        $this->assertSoftDeleted('warehouses', ['id' => $warehouse->id]);
    }

    public function test_find_by_id_returns_warehouse(): void
    {
        $warehouse = Warehouse::factory()->create();

        $result = $this->service->findById($warehouse->id);

        $this->assertEquals($warehouse->id, $result->id);
    }
}