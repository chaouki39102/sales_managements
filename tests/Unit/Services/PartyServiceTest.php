<?php

namespace Tests\Unit\Services;

use App\Services\PartyService;
use App\Models\Party;
use App\Models\PartyType;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Core\Exceptions\BusinessRuleException;

class PartyServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PartyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PartyService();
    }

    public function test_create_party_generates_code_and_slug(): void
    {
        $partyType = PartyType::factory()->create();

        $data = [
            'name' => 'Test Company',
            'party_type_id' => $partyType->id,
            'email' => 'test@company.com',
        ];

        $party = $this->service->create($data);

        $this->assertInstanceOf(Party::class, $party);
        $this->assertNotNull($party->code);
        $this->assertNotNull($party->slug);
        $this->assertEquals('test-company', $party->slug);
    }

    public function test_create_party_with_valid_algerian_fields(): void
    {
        $partyType = PartyType::factory()->create();

        $data = [
            'name' => 'Algerian Company',
            'party_type_id' => $partyType->id,
            'nif' => '123456789012345',
            'nis' => '12345678901',
            'rc' => 'RC123456',
            'email' => 'algerian@company.dz',
        ];

        $party = $this->service->create($data);

        $this->assertEquals('123456789012345', $party->nif);
        $this->assertEquals('12345678901', $party->nis);
    }

    public function test_create_party_fails_with_invalid_nif(): void
    {
        $partyType = PartyType::factory()->create();

        $data = [
            'name' => 'Test Company',
            'party_type_id' => $partyType->id,
            'nif' => 'invalid',
        ];

        $this->expectException(BusinessRuleException::class);
        $this->service->create($data);
    }

    public function test_create_party_fails_with_duplicate_nif(): void
    {
        $partyType = PartyType::factory()->create();
        
        Party::factory()->create(['nif' => '123456789012345']);

        $data = [
            'name' => 'Second Company',
            'party_type_id' => $partyType->id,
            'nif' => '123456789012345',
        ];

        $this->expectException(BusinessRuleException::class);
        $this->service->create($data);
    }

    public function test_create_party_fails_with_invalid_nis(): void
    {
        $partyType = PartyType::factory()->create();

        $data = [
            'name' => 'Test Company',
            'party_type_id' => $partyType->id,
            'nis' => 'short',
        ];

        $this->expectException(BusinessRuleException::class);
        $this->service->create($data);
    }

    public function test_create_party_fails_with_negative_credit_limit(): void
    {
        $partyType = PartyType::factory()->create();

        $data = [
            'name' => 'Test Company',
            'party_type_id' => $partyType->id,
            'credit_limit' => -100,
        ];

        $this->expectException(BusinessRuleException::class);
        $this->service->create($data);
    }

    public function test_update_party_changes_name_and_generates_new_slug(): void
    {
        $party = Party::factory()->create([
            'name' => 'Old Name',
            'slug' => 'old-name',
        ]);

        $updated = $this->service->update($party, ['name' => 'New Name']);

        $this->assertEquals('New Name', $updated->name);
        $this->assertEquals('new-name', $updated->slug);
    }

    public function test_update_party_fails_to_deactivate_with_active_documents(): void
    {
        $party = Party::factory()->create(['active' => true]);
        
        $party->commercialDocuments()->create([
            'document_type_id' => 1,
            'document_status_id' => 2,
            'document_number' => 'INV-001',
            'document_date' => now(),
            'total_ht' => 100,
            'total_tva' => 19,
            'total_ttc' => 119,
            'net_to_pay' => 119,
            'remaining_amount' => 119,
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->update($party, ['active' => false]);
    }

    public function test_delete_party_fails_with_existing_documents(): void
    {
        $party = Party::factory()->create();
        
        $party->commercialDocuments()->create([
            'document_type_id' => 1,
            'document_status_id' => 1,
            'document_number' => 'INV-001',
            'document_date' => now(),
            'total_ht' => 100,
            'total_tva' => 19,
            'total_ttc' => 119,
            'net_to_pay' => 119,
            'remaining_amount' => 119,
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($party);
    }

    public function test_delete_party_fails_with_existing_payments(): void
    {
        $party = Party::factory()->create();
        
        $party->payments()->create([
            'payment_mode_id' => 1,
            'amount' => 100,
            'payment_date' => now(),
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service->delete($party);
    }

    public function test_delete_party_succeeds_without_dependencies(): void
    {
        $party = Party::factory()->create();

        $result = $this->service->delete($party);

        $this->assertTrue($result);
        $this->assertSoftDeleted('parties', ['id' => $party->id]);
    }

    public function test_find_by_id_returns_party_with_relations(): void
    {
        $party = Party::factory()->create();

        $result = $this->service->findById($party->id);

        $this->assertEquals($party->id, $result->id);
    }

    public function test_get_customers_returns_only_customers(): void
    {
        Party::factory()->count(3)->create(['party_type_id' => 1, 'active' => true]);
        Party::factory()->count(2)->create(['party_type_id' => 2, 'active' => true]);

        $customers = $this->service->getCustomers();

        $this->assertCount(3, $customers);
    }

    public function test_get_suppliers_returns_only_suppliers(): void
    {
        Party::factory()->count(2)->create(['party_type_id' => 1, 'active' => true]);
        Party::factory()->count(3)->create(['party_type_id' => 2, 'active' => true]);

        $suppliers = $this->service->getSuppliers();

        $this->assertCount(3, $suppliers);
    }
}