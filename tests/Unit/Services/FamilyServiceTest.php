<?php

namespace Tests\Unit\Services;

use App\Services\FamilyService;
use App\Models\Family;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FamilyServiceTest extends TestCase
{
    use RefreshDatabase;

    protected FamilyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FamilyService();
    }

    public function test_create_family_generates_code_and_slug(): void
    {
        $data = [
            'name' => 'Electronics',
        ];

        $family = $this->service->create($data);

        $this->assertInstanceOf(Family::class, $family);
        $this->assertNotNull($family->code);
        $this->assertStringStartsWith('FAM', $family->code);
        $this->assertEquals('electronics', $family->slug);
    }

    public function test_create_family_with_custom_code(): void
    {
        $data = [
            'name' => 'Electronics',
            'code' => 'FAM-001',
        ];

        $family = $this->service->create($data);

        $this->assertEquals('FAM-001', $family->code);
    }

    public function test_update_family_changes_name_and_generates_new_slug(): void
    {
        $family = Family::factory()->create([
            'name' => 'Old Family',
            'slug' => 'old-family',
        ]);

        $updated = $this->service->update($family, ['name' => 'New Family']);

        $this->assertEquals('New Family', $updated->name);
        $this->assertEquals('new-family', $updated->slug);
    }

    public function test_delete_family_succeeds(): void
    {
        $family = Family::factory()->create();

        $result = $this->service->delete($family);

        $this->assertTrue($result);
    }

    public function test_find_by_id_returns_family(): void
    {
        $family = Family::factory()->create();

        $result = $this->service->findById($family->id);

        $this->assertEquals($family->id, $result->id);
    }
}