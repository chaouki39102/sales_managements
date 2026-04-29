<?php

namespace Tests\Feature;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\DocumentType;
use App\Models\DocumentStatus;
use App\Models\Warehouse;
use App\Models\Currency;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CommercialDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Party $party;
    protected DocumentType $documentType;
    protected DocumentStatus $documentStatus;
    protected Warehouse $warehouse;
    protected Currency $currency;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->party = Party::factory()->create();
        $this->documentType = DocumentType::factory()->create();
        $this->documentStatus = DocumentStatus::factory()->create();
        $this->warehouse = Warehouse::factory()->create();
        $this->currency = Currency::factory()->create();
    }

    public function test_unauthenticated_user_cannot_access_documents(): void
    {
        $response = $this->getJson('/api/v1/commercial-documents');
        $response->assertStatus(401);
    }

    public function test_user_can_list_documents(): void
    {
        CommercialDocument::factory()->count(5)->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/commercial-documents');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data',
                'timestamp',
            ]);
    }

    public function test_user_can_create_document(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/commercial-documents', [
                'party_id' => $this->party->id,
                'document_type_id' => $this->documentType->id,
                'document_status_id' => $this->documentStatus->id,
                'warehouse_id' => $this->warehouse->id,
                'currency_id' => $this->currency->id,
                'document_date' => now()->toDateString(),
                'lines' => [],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => ['id', 'document_number'],
            ]);

        $this->assertDatabaseHas('commercial_documents', [
            'party_id' => $this->party->id,
        ]);
    }

    public function test_create_document_with_lines(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/commercial-documents', [
                'party_id' => $this->party->id,
                'document_type_id' => $this->documentType->id,
                'document_status_id' => $this->documentStatus->id,
                'warehouse_id' => $this->warehouse->id,
                'currency_id' => $this->currency->id,
                'document_date' => now()->toDateString(),
                'lines' => [
                    [
                        'product_id' => 1,
                        'quantity' => 10,
                        'unit_price_ht' => 100,
                        'tva_rate' => 19,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $document = \App\Models\CommercialDocument::first();
        $this->assertNotNull($document->total_ht);
        $this->assertNotNull($document->total_tva);
    }

    public function test_create_document_fails_with_invalid_data(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/commercial-documents', [
                'party_id' => null,
            ]);

        $response->assertStatus(422);
    }

    public function test_user_can_show_document(): void
    {
        $document = CommercialDocument::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/commercial-documents/{$document->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $document->id);
    }

    public function test_user_can_update_document(): void
    {
        $document = CommercialDocument::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/v1/commercial-documents/{$document->id}", [
                'notes' => 'Updated notes',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('commercial_documents', [
            'id' => $document->id,
            'notes' => 'Updated notes',
        ]);
    }

    public function test_user_can_delete_document(): void
    {
        $document = CommercialDocument::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/commercial-documents/{$document->id}");

        $response->assertStatus(200);
    }

    public function test_user_can_lock_document(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => false]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/commercial-documents/{$document->id}/lock");

        $response->assertStatus(200);

        $document->refresh();
        $this->assertTrue($document->is_locked);
    }

    public function test_user_can_unlock_document(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => true]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/commercial-documents/{$document->id}/unlock");

        $response->assertStatus(200);

        $document->refresh();
        $this->assertFalse($document->is_locked);
    }

    public function test_user_can_cancel_document(): void
    {
        $cancelledStatus = DocumentStatus::factory()->create(['is_cancelled' => true]);
        $document = CommercialDocument::factory()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/commercial-documents/{$document->id}/cancel", [
                'reason' => 'Test cancellation',
            ]);

        $response->assertStatus(200);

        $document->refresh();
        $this->assertNotNull($document->cancellation_reason);
    }

    public function test_user_can_list_unpaid_documents(): void
    {
        CommercialDocument::factory()->count(3)->create(['remaining_amount' => 100]);
        CommercialDocument::factory()->count(2)->create(['remaining_amount' => 0]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/commercial-documents/unpaid');

        $response->assertStatus(200);
    }
}