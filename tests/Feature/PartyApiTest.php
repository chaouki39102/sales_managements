<?php

namespace Tests\Feature;

use App\Models\Party;
use App\Models\PartyType;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PartyApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_unauthenticated_user_cannot_access_parties(): void
    {
        $response = $this->getJson('/api/v1/parties');
        $response->assertStatus(401);
    }

    public function test_user_can_list_parties(): void
    {
        Party::factory()->count(5)->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/parties');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data',
                'timestamp',
            ]);
    }

    public function test_user_can_create_party(): void
    {
        $partyType = PartyType::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/parties', [
                'name' => 'Test Company',
                'party_type_id' => $partyType->id,
                'email' => 'test@company.com',
                'phone' => '1234567890',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => ['id', 'name', 'code', 'slug'],
            ]);

        $this->assertDatabaseHas('parties', [
            'name' => 'Test Company',
            'email' => 'test@company.com',
        ]);
    }

    public function test_create_party_fails_with_invalid_data(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/parties', [
                'name' => '',
            ]);

        $response->assertStatus(422);
    }

    public function test_user_can_show_party(): void
    {
        $party = Party::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/parties/{$party->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $party->id);
    }

    public function test_user_can_update_party(): void
    {
        $party = Party::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/v1/parties/{$party->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('parties', [
            'id' => $party->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_user_can_delete_party(): void
    {
        $party = Party::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/parties/{$party->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('parties', ['id' => $party->id]);
    }

    public function test_user_can_list_customers(): void
    {
        Party::factory()->count(3)->create(['party_type_id' => 1, 'active' => true]);
        Party::factory()->count(2)->create(['party_type_id' => 2, 'active' => true]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/customers');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_user_can_list_suppliers(): void
    {
        Party::factory()->count(2)->create(['party_type_id' => 1, 'active' => true]);
        Party::factory()->count(3)->create(['party_type_id' => 2, 'active' => true]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/suppliers');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }
}