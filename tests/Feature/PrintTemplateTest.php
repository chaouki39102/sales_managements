<?php

use App\Models\Company;
use App\Models\PrintTemplate;
use App\Services\CompanyContextService;

beforeEach(function () {
    $company = Company::firstOrCreate(
        ['slug' => TEST_COMPANY_SLUG],
        ['name' => 'Test Company', 'active' => true]
    );
    app(CompanyContextService::class)->set($company->id);
    $this->companyId = $company->id;
});

it('lists print templates', function () {
    $response = actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/' . testCompanySlug() . '/print-templates');

    $response->assertOk();
    expect($response->json('data'))->toBeArray();
});

it('creates a print template', function () {
    $response = actingAsAuthenticatedTenantUser()
        ->postJson('/api/v1/' . testCompanySlug() . '/print-templates', [
            'name'          => 'Test FV Template',
            'doc_type_code' => 'FV',
            'paper_size'    => 'A4',
        ]);

    $response->assertCreated();
    expect($response->json('data.name'))->toBe('Test FV Template');
    expect($response->json('data.doc_type_code'))->toBe('FV');
    expect($response->json('data.company_id'))->toBe($this->companyId);
});

it('retrieves a single print template', function () {
    $tpl = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Get Me',
        'doc_type_code' => 'POS',
        'paper_size'    => '80mm',
    ]);

    $response = actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/' . testCompanySlug() . '/print-templates/' . $tpl->id);

    $response->assertOk();
    expect($response->json('data.id'))->toBe($tpl->id);
    expect($response->json('data.name'))->toBe('Get Me');
});

it('updates a print template', function () {
    $tpl = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Old Name',
        'doc_type_code' => 'FV',
        'paper_size'    => 'A4',
    ]);

    $response = actingAsAuthenticatedTenantUser()
        ->putJson('/api/v1/' . testCompanySlug() . '/print-templates/' . $tpl->id, [
            'name' => 'New Name',
        ]);

    $response->assertOk();
    expect($response->json('data.name'))->toBe('New Name');
});

it('deletes a print template', function () {
    $tpl = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Delete Me',
        'doc_type_code' => 'FV',
        'paper_size'    => 'A4',
    ]);

    $response = actingAsAuthenticatedTenantUser()
        ->deleteJson('/api/v1/' . testCompanySlug() . '/print-templates/' . $tpl->id);

    $response->assertOk();
    expect(PrintTemplate::withoutGlobalscopes()->find($tpl->id))->toBeNull();
});

it('sets default and clears sibling defaults for same doc type', function () {
    $tplA = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Template A',
        'doc_type_code' => 'FV',
        'paper_size'    => 'A4',
        'is_default'    => true,
    ]);

    $tplB = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Template B',
        'doc_type_code' => 'FV',
        'paper_size'    => 'A4',
        'is_default'    => false,
    ]);

    $response = actingAsAuthenticatedTenantUser()
        ->postJson('/api/v1/' . testCompanySlug() . '/print-templates/' . $tplB->id . '/set-default');

    $response->assertOk();

    $tplA->refresh();
    $tplB->refresh();
    expect($tplA->is_default)->toBeFalse();
    expect($tplB->is_default)->toBeTrue();
});

it('duplicates a print template preserving config', function () {
    $tpl = PrintTemplate::create([
        'company_id'     => $this->companyId,
        'name'          => 'Original',
        'doc_type_code' => 'FV',
        'paper_size'    => 'A4',
        'config'        => ['show_logo' => false, 'title_text' => 'HELLO'],
    ]);

    $response = actingAsAuthenticatedTenantUser()
        ->postJson('/api/v1/' . testCompanySlug() . '/print-templates/' . $tpl->id . '/duplicate');

    $response->assertCreated();
    expect($response->json('data.name'))->toBe('نسخة من Original');
    expect($response->json('data.id'))->not->toBe($tpl->id);

    $copy = PrintTemplate::withoutGlobalscopes()->find($response->json('data.id'));
    expect($copy)->not->toBeNull();
    expect($copy->config['show_logo'])->toBeFalse();
    expect($copy->config['title_text'])->toBe('HELLO');
});
