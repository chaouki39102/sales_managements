<?php

namespace Tests\Unit\Services;

use App\Services\BrandService;
use App\Models\Brand;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BrandServiceTest extends TestCase
{
    use RefreshDatabase;

    protected BrandService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new BrandService();
    }

    public function test_create_brand_generates_slug(): void
    {
        $data = [
            'name' => 'Samsung',
        ];

        $brand = $this->service->create($data);

        $this->assertInstanceOf(Brand::class, $brand);
        $this->assertEquals('samsung', $brand->slug);
    }

    public function test_create_brand_with_custom_slug(): void
    {
        $data = [
            'name' => 'Samsung',
            'slug' => 'samsung-electronics',
        ];

        $brand = $this->service->create($data);

        $this->assertEquals('samsung-electronics', $brand->slug);
    }

    public function test_update_brand_changes_name_and_generates_new_slug(): void
    {
        $brand = Brand::factory()->create([
            'name' => 'Old Brand',
            'slug' => 'old-brand',
        ]);

        $updated = $this->service->update($brand, ['name' => 'New Brand']);

        $this->assertEquals('New Brand', $updated->name);
        $this->assertEquals('new-brand', $updated->slug);
    }

    public function test_delete_brand_succeeds(): void
    {
        $brand = Brand::factory()->create();

        $result = $this->service->delete($brand);

        $this->assertTrue($result);
    }

    public function test_find_by_id_returns_brand(): void
    {
        $brand = Brand::factory()->create();

        $result = $this->service->findById($brand->id);

        $this->assertEquals($brand->id, $result->id);
    }
}