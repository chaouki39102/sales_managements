<?php

namespace Tests\Feature;

use App\Models\CommercialDocument;
use App\Models\Company;
use App\Models\DocumentType;
use App\Models\Party;
use App\Services\FiscalInvoiceQrService;
use Carbon\Carbon;

test('buildData carries seller/buyer identifiers and invoice fields', function () {
    $doc = makeFiscalDoc();

    $data = app(FiscalInvoiceQrService::class)->buildData($doc);

    expect($data['v'])->toBe(FiscalInvoiceQrService::VERSION)
        ->and($data['seller'])->toMatchArray([
            'name' => 'ACME Emballage',
            'nif'  => '21656494498789',
            'nis'  => '65484897897897',
            'ai'   => '3912052464',
            'rc'   => '65454848787',
        ])
        ->and($data['buyer'])->toMatchArray(['name' => 'Client Cash', 'nif' => '999999999999'])
        ->and($data['invoice'])->toMatchArray([
            'number' => 'FV-2026-000001',
            'date'   => '2026-08-01',
            'type'   => 'FV',
        ]);
});

test('dataString is valid JSON and round-trips through parse', function () {
    $svc  = app(FiscalInvoiceQrService::class);
    $doc  = makeFiscalDoc();
    $json = $svc->dataString($doc);

    expect(json_decode($json, true))->not->toBeNull()
        ->and(FiscalInvoiceQrService::parse($json))->toEqual($svc->buildData($doc));

    $decoded = FiscalInvoiceQrService::parse($json);
    expect((float) $decoded['amounts']['ht'])->toBe((float) $svc->buildData($doc)['amounts']['ht']);
});

test('validateData rejects missing fields or unknown version', function () {
    $good = app(FiscalInvoiceQrService::class)->buildData(makeFiscalDoc());

    expect(FiscalInvoiceQrService::validateData($good))->toBeTrue();

    unset($good['amounts']['ttc']);
    expect(FiscalInvoiceQrService::validateData($good))->toBeFalse();

    $good2      = app(FiscalInvoiceQrService::class)->buildData(makeFiscalDoc());
    $good2['v'] = 999;
    expect(FiscalInvoiceQrService::validateData($good2))->toBeFalse();

    expect(FiscalInvoiceQrService::validateData([]))->toBeFalse();
});

test('hash is stable for the same document and changes with totals', function () {
    $svc = app(FiscalInvoiceQrService::class);
    $a   = $svc->hash(makeFiscalDoc());
    $b   = $svc->hash(makeFiscalDoc());

    expect($a)->toBe($b)->and(strlen($a))->toBe(64);

    $doc   = makeFiscalDoc();
    $doc->total_ttc = 999.99;
    expect($svc->hash($doc))->not->toBe($a);
});

test('svgBase64 returns a decodable UTF-8 SVG', function () {
    $b64 = app(FiscalInvoiceQrService::class)->svgBase64(makeFiscalDoc());

    $svg = base64_decode($b64);
    expect(str_starts_with($svg, '<?xml'))->toBeTrue()
        ->and(str_contains($svg, '<svg'))->toBeTrue()
        ->and(strlen($svg))->toBeGreaterThan(1000);
});

function makeFiscalDoc(): CommercialDocument
{
    $doc = new CommercialDocument([
        'document_number' => 'FV-2026-000001',
        'total_ht'        => 100.0,
        'total_tva'       => 19.0,
        'total_discount'  => 0.0,
        'total_stamp'     => 0.0,
        'total_ttc'       => 119.0,
        'net_to_pay'      => 119.0,
    ]);
    $doc->document_date = Carbon::parse('2026-08-01');
    $doc->setRelation('company', new Company([
        'name' => 'ACME Emballage',
        'nif'  => '21656494498789',
        'nis'  => '65484897897897',
        'ai'   => '3912052464',
        'rc'   => '65454848787',
        'address' => 'Alger',
    ]));
    $doc->setRelation('party', new Party(['name' => 'Client Cash', 'nif' => '999999999999']));
    $doc->setRelation('documentType', new DocumentType(['code' => 'FV']));

    return $doc;
}
