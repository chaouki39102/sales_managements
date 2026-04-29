<?php

namespace Tests\Unit\Services;

use App\Services\CommercialDocumentService;
use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\DocumentType;
use App\Models\DocumentStatus;
use App\Models\Warehouse;
use App\Models\Currency;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Core\Exceptions\BusinessRuleException;

class CommercialDocumentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected CommercialDocumentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CommercialDocumentService();
    }

    public function test_create_document_generates_number(): void
    {
        $party = Party::factory()->create();
        $docType = DocumentType::factory()->create(['code' => 'invoice']);
        $docStatus = DocumentStatus::factory()->create(['is_default' => true]);

        $data = [
            'party_id' => $party->id,
            'document_type_id' => $docType->id,
            'document_status_id' => $docStatus->id,
            'document_date' => now(),
            'currency_id' => 1,
            'lines' => [],
        ];

        $document = $this->service->create($data);

        $this->assertInstanceOf(CommercialDocument::class, $document);
        $this->assertNotNull($document->document_number);
    }

    public function test_create_document_with_lines_calculates_totals(): void
    {
        $party = Party::factory()->create();
        $docType = DocumentType::factory()->create(['code' => 'invoice']);
        $docStatus = DocumentStatus::factory()->create(['is_default' => true]);
        $warehouse = Warehouse::factory()->create();
        $currency = Currency::factory()->create();

        $data = [
            'party_id' => $party->id,
            'document_type_id' => $docType->id,
            'document_status_id' => $docStatus->id,
            'document_date' => now(),
            'warehouse_id' => $warehouse->id,
            'currency_id' => $currency->id,
            'lines' => [
                [
                    'product_id' => 1,
                    'quantity' => 10,
                    'unit_price_ht' => 100,
                    'tva_rate' => 19,
                ],
                [
                    'product_id' => 2,
                    'quantity' => 5,
                    'unit_price_ht' => 50,
                    'tva_rate' => 19,
                ],
            ],
        ];

        $document = $this->service->create($data);

        $this->assertEquals(1250, $document->total_ht);
        $this->assertEquals(237.5, $document->total_tva);
    }

    public function test_update_document_fails_when_locked(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => true]);

        $this->expectException(BusinessRuleException::class);
        $this->service->update($document, ['notes' => 'New notes']);
    }

    public function test_update_document_fails_when_exported_to_accounting(): void
    {
        $document = CommercialDocument::factory()->create(['is_exported_to_accounting' => true]);

        $this->expectException(BusinessRuleException::class);
        $this->service->update($document, ['notes' => 'New notes']);
    }

    public function test_delete_document_fails_when_locked(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => true]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($document);
    }

    public function test_delete_document_fails_when_exported(): void
    {
        $document = CommercialDocument::factory()->create(['is_exported_to_accounting' => true]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($document);
    }

    public function test_delete_document_fails_with_payments(): void
    {
        $document = CommercialDocument::factory()->create();

        $document->payments()->create([
            'payment_mode_id' => 1,
            'amount' => 100,
            'payment_date' => now(),
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($document);
    }

    public function test_find_by_id_returns_document_with_relations(): void
    {
        $document = CommercialDocument::factory()->create();

        $result = $this->service->findById($document->id);

        $this->assertEquals($document->id, $result->id);
    }

    public function test_lock_document_sets_lock_flag(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => false]);

        $this->service->lockDocument($document);

        $document->refresh();
        $this->assertTrue($document->is_locked);
    }

    public function test_unlock_document_removes_lock_flag(): void
    {
        $document = CommercialDocument::factory()->create(['is_locked' => true]);

        $this->service->unlockDocument($document);

        $document->refresh();
        $this->assertFalse($document->is_locked);
    }

    public function test_cancel_document_fails_with_payments(): void
    {
        $document = CommercialDocument::factory()->create();

        $document->payments()->create([
            'payment_mode_id' => 1,
            'amount' => 100,
            'payment_date' => now(),
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->cancelDocument($document, 'Test cancellation');
    }

    public function test_cancel_document_succeeds_without_payments(): void
    {
        $document = CommercialDocument::factory()->create();
        $cancelledStatus = DocumentStatus::factory()->create(['is_cancelled' => true]);

        $this->service->cancelDocument($document, 'Test cancellation');

        $document->refresh();
        $this->assertNotNull($document->cancellation_reason);
    }
}