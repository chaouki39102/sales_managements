<?php

namespace Tests\Unit\Services;

use App\Services\CurrencyService;
use App\Models\Currency;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrencyServiceTest extends TestCase
{
    use RefreshDatabase;

    protected CurrencyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CurrencyService();
    }

    public function test_create_currency(): void
    {
        $data = [
            'name' => 'US Dollar',
            'code' => 'USD',
            'symbol' => '$',
            'exchange_rate' => 1.0,
        ];

        $currency = $this->service->create($data);

        $this->assertInstanceOf(Currency::class, $currency);
        $this->assertEquals('USD', $currency->code);
    }

    public function test_update_currency_changes_name(): void
    {
        $currency = Currency::factory()->create(['name' => 'Old Name']);

        $updated = $this->service->update($currency, ['name' => 'New Currency']);

        $this->assertEquals('New Currency', $updated->name);
    }

    public function test_delete_currency_succeeds(): void
    {
        $currency = Currency::factory()->create();

        $result = $this->service->delete($currency);

        $this->assertTrue($result);
    }

    public function test_find_by_id_returns_currency(): void
    {
        $currency = Currency::factory()->create();

        $result = $this->service->findById($currency->id);

        $this->assertEquals($currency->id, $result->id);
    }
}