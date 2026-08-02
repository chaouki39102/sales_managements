<?php

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\TransactionIntegrityService;
use Illuminate\Support\Collection;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    // Setting::getSetting('fiscal_stamp_enabled', ...) is Cache::remember-backed.
    // Seed the array cache so the hermetic unit tests never touch the DB.
    Cache::put('setting:1:fiscal_stamp_enabled', true);
});

function integrityService(): TransactionIntegrityService
{
    return new TransactionIntegrityService(new FiscalStampCalculator());
}

function makeLine(array $attrs): CommercialDocumentLine
{
    $line = new CommercialDocumentLine();
    foreach ($attrs as $k => $v) {
        $line->setAttribute($k, $v);
    }
    return $line;
}

function makeDoc(array $attrs, array $lines): CommercialDocument
{
    $doc = new CommercialDocument();
    foreach ($attrs as $k => $v) {
        $doc->setAttribute($k, $v);
    }
    $doc->setRelation('lines', new Collection($lines));
    return $doc;
}

// ───────────────────────────────────────────────────────────────
// recomputeLine — mirrors CommercialDocumentLineObserver exactly
// ───────────────────────────────────────────────────────────────

it('recomputes a percentage-discount line from first principles', function () {
    $r = integrityService()->recomputeLine([
        'quantity'          => 2,
        'unit_price_ht'     => 100,
        'discount_percentage' => 10,
        'tva_rate'          => 19,
    ]);

    expect($r['expected'])->toEqual([
        'total_ht'              => 180.0,
        'total_tva'             => 34.2,
        'total_ttc'             => 214.2,
        'total_discount_amount' => 20.0,
        'discount_amount'       => 10.0,
    ]);
});

it('recomputes a fixed-amount tier line with a packaging snapshot (per-base-unit × baseQty)', function () {
    $r = integrityService()->recomputeLine([
        'quantity'                   => 1,     // 1 pack of 12
        'unit_price_ht'              => 1440,  // pack price
        'discount_amount_per_unit'   => 60,    // per base unit
        'packaging_units_snapshot'   => 12,
        'tva_rate'                   => 19,
    ]);

    // gross = 1 × 1440 ; discount = 60 × (1 × 12) = 720 ; ht = 720 ; tva = 136.8
    expect($r['expected'])->toEqual([
        'total_ht'              => 720.0,
        'total_tva'             => 136.8,
        'total_ttc'             => 856.8,
        'total_discount_amount' => 720.0,
        'discount_amount'       => 60.0,
    ]);
});

it('treats a null packaging snapshot as 1 (legacy lines stay consistent)', function () {
    $r = integrityService()->recomputeLine([
        'quantity'                   => 2,
        'unit_price_ht'              => 100,
        'discount_amount_per_unit'   => 5,
        'packaging_units_snapshot'   => null,
        'tva_rate'                   => 0,
    ]);

    expect($r['expected']['total_discount_amount'])->toBe(10.0); // 5 × (2 × 1)
});

// ───────────────────────────────────────────────────────────────
// assertPayloadLine — rejects garbage before it hits the ledger
// ───────────────────────────────────────────────────────────────

it('accepts a valid payload line', function () {
    integrityService()->assertPayloadLine([
        'quantity'          => 1,
        'unit_price_ht'     => 120,
        'pack_qty'          => 12,
        'discount_percentage' => 0,
        'tva_rate'          => 19,
        'packaging_id'      => 5,
    ], 0);

    expect(true)->toBeTrue();
});

it('accepts copy-path lines (stored pack price + snapshot, no pack_qty)', function () {
    integrityService()->assertPayloadLine([
        'product_id'                  => 1,
        'quantity'                    => 2,
        'unit_price_ht'               => 1440,
        'discount_percentage'         => 0,
        'tva_rate'                    => 19,
        'packaging_id'                => 5,
        'packaging_units_snapshot'    => 12,
    ], 0);

    expect(true)->toBeTrue();
});

it('rejects a negative quantity', function () {
    integrityService()->assertPayloadLine([
        'quantity'      => -3,
        'unit_price_ht' => 100,
        'tva_rate'      => 19,
    ], 0);
})->throws(BusinessRuleException::class, 'الكمية');

it('rejects a discount percentage above 100', function () {
    integrityService()->assertPayloadLine([
        'quantity'            => 1,
        'unit_price_ht'       => 100,
        'discount_percentage' => 150,
        'tva_rate'            => 19,
    ], 0);
})->throws(BusinessRuleException::class, 'نسبة الخصم');

it('rejects a negative unit price', function () {
    integrityService()->assertPayloadLine([
        'quantity'      => 1,
        'unit_price_ht' => -50,
        'tva_rate'      => 19,
    ], 0);
})->throws(BusinessRuleException::class, 'سعر الوحدة');

it('rejects a packaged line with no positive pack factor', function () {
    integrityService()->assertPayloadLine([
        'product_id'      => 1,
        'quantity'        => 1,
        'unit_price_ht'   => 120,
        'tva_rate'        => 19,
        'packaging_id'    => 5,
    ], 0);
})->throws(BusinessRuleException::class, 'معامل تعبئة');

// ───────────────────────────────────────────────────────────────
// violationsForDocument — clean and clear or not
// ───────────────────────────────────────────────────────────────

it('declares a mathematically consistent document as clean', function () {
    $line = makeLine([
        'quantity'            => 2,
        'unit_price_ht'       => 100,
        'discount_percentage' => 10,
        'tva_rate'            => 19,
        'total_ht'            => 180,
        'total_tva'           => 34.2,
        'total_ttc'           => 214.2,
        'total_discount_amount' => 20,
        'discount_amount'     => 10,
    ]);

    // gross = 214.2 × 1% → clamped to min stamp = 5
    $doc = makeDoc([
        'company_id'      => 1,
        'total_ht'        => 180,
        'total_tva'       => 34.2,
        'total_discount'  => 20,
        'total_ttc'       => 214.2,
        'total_stamp'     => 5,
        'net_to_pay'      => 219.2,
    ], [$line]);

    expect(integrityService()->violationsForDocument($doc))->toBeEmpty();
});

it('flags a document whose stored total does not match its lines', function () {
    $line = makeLine([
        'quantity'            => 2,
        'unit_price_ht'       => 100,
        'discount_percentage' => 10,
        'tva_rate'            => 19,
        'total_ht'            => 180,
        'total_tva'           => 34.2,
        'total_ttc'           => 214.2,
        'total_discount_amount' => 20,
        'discount_amount'     => 10,
    ]);

    $doc = makeDoc([
        'company_id'      => 1,
        'total_ht'        => 1800,   // ← wrong
        'total_tva'       => 34.2,
        'total_discount'  => 20,
        'total_ttc'       => 214.2,
        'total_stamp'     => 5,
        'net_to_pay'      => 219.2,
    ], [$line]);

    $violations = integrityService()->violationsForDocument($doc);

    expect($violations)->not->toBeEmpty()
        ->and(collect($violations)->first(fn ($v) => str_contains($v, 'total_ht')))->not->toBeNull();
});

it('flags a line whose stored totals were not derived from its inputs', function () {
    $line = makeLine([
        'quantity'            => 2,
        'unit_price_ht'       => 100,
        'discount_percentage' => 10,
        'tva_rate'            => 19,
        'total_ht'            => 9999,  // ← wrong
        'total_tva'           => 34.2,
        'total_ttc'           => 214.2,
        'total_discount_amount' => 20,
        'discount_amount'     => 10,
    ]);

    $doc = makeDoc([
        'company_id'      => 1,
        'total_ht'        => 9999,
        'total_tva'       => 34.2,
        'total_discount'  => 20,
        'total_ttc'       => 214.2,
        'total_stamp'     => 5,
        'net_to_pay'      => 219.2,
    ], [$line]);

    $violations = integrityService()->violationsForDocument($doc);

    expect(collect($violations)->filter(fn ($v) => str_contains($v, 'السطر'))->count())->toBeGreaterThan(0);
});
