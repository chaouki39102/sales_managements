<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Family;
use App\Models\Brand;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_unauthenticated_user_cannot_access_products(): void
    {
        $response = $this->getJson('/api/v1/products');
        $response->assertStatus(401);
    }

    public function test_user_can_list_products(): void
    {
        Product::factory()->count(5)->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data',
                'timestamp',
            ]);
    }

    public function test_user_can_create_product(): void
    {
        $family = Family::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => 'Test Product',
                'product_type_id' => 1,
                'family_id' => $family->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => ['id', 'name', 'slug'],
            ]);

        $this->assertDatabaseHas('products', [
            'name' => 'Test Product',
        ]);
    }

    public function test_create_product_fails_with_invalid_data(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => '',
            ]);

        $response->assertStatus(422);
    }

    public function test_user_can_show_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $product->id);
    }

    public function test_user_can_update_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'name' => 'Updated Product',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product',
        ]);
    }

    public function test_user_can_delete_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_user_can_list_active_products(): void
    {
        Product::factory()->count(3)->create(['active' => true]);
        Product::factory()->count(2)->create(['active' => false]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/products/active');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_user_can_filter_products_by_family(): void
    {
        $family = Family::factory()->create();
        
        Product::factory()->count(2)->create(['family_id' => $family->id, 'active' => true]);
        Product::factory()->count(3)->create(['active' => true]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/products/by-family/{$family->id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_user_can_filter_products_by_brand(): void
    {
        $brand = Brand::factory()->create();
        
        Product::factory()->count(2)->create(['brand_id' => $brand->id, 'active' => true]);
        Product::factory()->count(3)->create(['active' => true]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/products/by-brand/{$brand->id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }
}