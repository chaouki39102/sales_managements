<?php

namespace Tests\Unit\Services;

use App\Services\ProductService;
use App\Models\Product;
use App\Models\Family;
use App\Models\Brand;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Core\Exceptions\BusinessRuleException;

class ProductServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ProductService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ProductService();
    }

    public function test_create_product_generates_slug(): void
    {
        $data = [
            'name' => 'Test Product',
            'product_type_id' => 1,
        ];

        $product = $this->service->create($data);

        $this->assertInstanceOf(Product::class, $product);
        $this->assertEquals('test-product', $product->slug);
    }

    public function test_create_product_with_family_and_brand(): void
    {
        $family = Family::factory()->create();
        $brand = Brand::factory()->create();

        $data = [
            'name' => 'Brand Product',
            'product_type_id' => 1,
            'family_id' => $family->id,
            'brand_id' => $brand->id,
        ];

        $product = $this->service->create($data);

        $this->assertEquals($family->id, $product->family_id);
        $this->assertEquals($brand->id, $product->brand_id);
    }

    public function test_update_product_changes_name_and_generates_new_slug(): void
    {
        $product = Product::factory()->create([
            'name' => 'Old Name',
            'slug' => 'old-name',
        ]);

        $updated = $this->service->update($product, ['name' => 'New Product Name']);

        $this->assertEquals('New Product Name', $updated->name);
        $this->assertStringStartsWith('new-product-name', $updated->slug);
    }

    public function test_update_product_fails_to_deactivate_with_variants(): void
    {
        $product = Product::factory()->create(['active' => true]);
        
        $product->variants()->create([
            'sku' => 'VAR-001',
            'name' => 'Variant 1',
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->update($product, ['active' => false]);
    }

    public function test_delete_product_fails_with_variants(): void
    {
        $product = Product::factory()->create();
        
        $product->variants()->create([
            'sku' => 'VAR-001',
            'name' => 'Variant 1',
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($product);
    }

    public function test_delete_product_fails_with_commercial_documents(): void
    {
        $product = Product::factory()->create();
        
        $product->commercialDocumentLines()->create([
            'commercial_document_id' => 1,
            'product_id' => 1,
            'quantity' => 10,
            'unit_price_ht' => 100,
            'total_ht' => 1000,
            'total_tva' => 190,
            'total_ttc' => 1190,
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($product);
    }

    public function test_delete_product_succeeds_without_dependencies(): void
    {
        $product = Product::factory()->create();

        $result = $this->service->delete($product);

        $this->assertTrue($result);
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_find_by_id_returns_product_with_relations(): void
    {
        $product = Product::factory()->create();

        $result = $this->service->findById($product->id);

        $this->assertEquals($product->id, $result->id);
    }

    public function test_get_active_products_returns_only_active(): void
    {
        Product::factory()->count(3)->create(['active' => true]);
        Product::factory()->count(2)->create(['active' => false]);

        $products = $this->service->getActiveProducts();

        $this->assertCount(3, $products);
    }

    public function test_get_products_by_family_filters_correctly(): void
    {
        $family = Family::factory()->create();
        
        Product::factory()->count(2)->create(['family_id' => $family->id, 'active' => true]);
        Product::factory()->count(3)->create(['active' => true]);

        $products = $this->service->getByFamily($family->id);

        $this->assertCount(2, $products);
    }

    public function test_get_products_by_brand_filters_correctly(): void
    {
        $brand = Brand::factory()->create();
        
        Product::factory()->count(2)->create(['brand_id' => $brand->id, 'active' => true]);
        Product::factory()->count(3)->create(['active' => true]);

        $products = $this->service->getByBrand($brand->id);

        $this->assertCount(2, $products);
    }
}