<?php

namespace Tests\Feature;

use App\Models\Party;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PartyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test getting list of parties
     */
    public function test_user_can_get_parties_list(): void
    {
        $user = User::factory()->create();
        Party::factory()->count(3)->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/parties');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'party_type',
                        'code',
                        'active',
                        'created_at',
                    ]
                ],
                'meta' => [
                    'total',
                    'per_page',
                    'current_page',
                    'last_page',
                ]
            ]);
    }

    /**
     * Test creating a new party
     */
    public function test_user_can_create_party(): void
    {
        $user = User::factory()->create();

        $partyData = [
            'party_type_id' => 1, // Assuming customer type exists
            'name' => 'Test Customer',
            'email' => 'test@example.com',
            'phone' => '+213123456789',
            'address' => '123 Test Street',
            'nif' => '1234567890123456', // Algerian NIF
            'rc' => 'RC123456',
            'active' => true,
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/parties', $partyData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'id',
                    'name',
                    'email',
                    'code',
                    'party_type',
                    'active',
                    'created_at',
                ]
            ]);

        $this->assertDatabaseHas('parties', [
            'name' => 'Test Customer',
            'email' => 'test@example.com',
            'nif' => '1234567890123456',
        ]);
    }

    /**
     * Test creating party with invalid data
     */
    public function test_user_cannot_create_party_with_invalid_data(): void
    {
        $user = User::factory()->create();

        $invalidData = [
            'name' => '', // Required field empty
            'email' => 'invalid-email', // Invalid email format
            'nif' => '123', // Invalid NIF (too short)
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/parties', $invalidData);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'status',
                'code',
                'message',
                'errors'
            ]);
    }

    /**
     * Test getting single party
     */
    public function test_user_can_get_single_party(): void
    {
        $user = User::factory()->create();
        $party = Party::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/parties/{$party->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'id',
                    'name',
                    'party_type',
                    'code',
                    'active',
                    'created_at',
                ]
            ]);
    }

    /**
     * Test updating party
     */
    public function test_user_can_update_party(): void
    {
        $user = User::factory()->create();
        $party = Party::factory()->create([
            'name' => 'Old Name',
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'phone' => '+213987654321',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/parties/{$party->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'id',
                    'name',
                    'phone',
                ]
            ]);

        $this->assertDatabaseHas('parties', [
            'id' => $party->id,
            'name' => 'Updated Name',
            'phone' => '+213987654321',
        ]);
    }

    /**
     * Test deleting party
     */
    public function test_user_can_delete_party(): void
    {
        $user = User::factory()->create();
        $party = Party::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/parties/{$party->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data'
            ]);

        $this->assertSoftDeleted('parties', [
            'id' => $party->id,
        ]);
    }

    /**
     * Test getting customers only
     */
    public function test_user_can_get_customers_list(): void
    {
        $user = User::factory()->create();

        // Create customers (assuming party_type_id 1 is customer)
        Party::factory()->count(2)->create(['party_type_id' => 1]);
        // Create suppliers (assuming party_type_id 2 is supplier)
        Party::factory()->count(2)->create(['party_type_id' => 2]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/customers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data'
            ]);

        // Should return only 2 customers
        $this->assertCount(2, $response->json('data'));
    }

    /**
     * Test getting suppliers only
     */
    public function test_user_can_get_suppliers_list(): void
    {
        $user = User::factory()->create();

        // Create customers
        Party::factory()->count(2)->create(['party_type_id' => 1]);
        // Create suppliers
        Party::factory()->count(3)->create(['party_type_id' => 2]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/suppliers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data'
            ]);

        // Should return only 3 suppliers
        $this->assertCount(3, $response->json('data'));
    }

    /**
     * Test unauthenticated access
     */
    public function test_unauthenticated_user_cannot_access_parties(): void
    {
        $response = $this->getJson('/api/v1/parties');

        $response->assertStatus(401);
    }

    /**
     * Test NIF uniqueness validation
     */
    public function test_party_nif_must_be_unique(): void
    {
        $user = User::factory()->create();
        Party::factory()->create([
            'nif' => '1234567890123456',
        ]);

        $partyData = [
            'party_type_id' => 1,
            'name' => 'Test Party',
            'nif' => '1234567890123456', // Same NIF
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/parties', $partyData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nif']);
    }
}