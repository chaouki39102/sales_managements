<?php

use App\Services\TemplateLibraryService;
use Tests\TestCase;

uses(TestCase::class);

/**
 * TemplateLibraryService ↔ client registry drift guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The library install endpoint answers 404 when the client asks for a template id
 * the backend does not ship. That is exactly what happened with
 * `dz-pos-receipt-80mm`: it was defined in the client registry only, so every
 * "install" of the POS receipt failed with
 * «القالب المحدد غير موجود في مكتبة القوالب الجاهزة».
 *
 * The drift was invisible because $templates and getMetadata() were both edited
 * by hand: a template added to $templates but forgotten in getMetadata() (or the
 * other way round) still passes a naive "does the id exist" check on only one side.
 *
 * THE CONTRACT THIS LOCKS IN
 * --------------------------
 *  1. Every client template id MUST be installable from the backend (client ⊆ backend).
 *     The backend MAY legitimately be a superset — the three `read_only` official
 *     Algerian forms (quote / purchase order / purchase invoice) are API-only and
 *     are intentionally absent from the simple client picker.
 *  2. Backend $templates keys and getMetadata() ids MUST be identical sets, so no
 *     template can be half-registered.
 *  3. Every backend paper_size MUST belong to the client's PaperSize union, or the
 *     client type cannot represent it. This is what caught `400x200mm` (never a
 *     valid paper) and pinned it to the real `40x20mm`.
 *  4. Backend configs are PARTIAL override sets, not full client configs: the client
 *     fromApiResponse() fills every missing key from the registry defaults. Shipping
 *     the full 242-key resolved config would bloat the payload with keys the backend
 *     has never carried.
 *
 * No database is required — TemplateLibraryService is a pure static holder.
 */

const VALID_PAPER_SIZES = ['80mm', '58mm', 'A4', 'A5', '40x20mm', '30x20mm', '60x40mm', '80x50mm', '100x50mm', 'none'];

function backendTemplates(): array
{
    $property = (new ReflectionClass(TemplateLibraryService::class))->getProperty('templates');
    $property->setAccessible(true);

    return $property->getValue();
}

/**
 * Client library template ids, scraped from the client SSOT registry.
 *
 * The `dz-` prefix is what makes this safe: column ids (r1..r8, c1..c5, cname,
 * col_*) live in the same file but never use the `dz-` namespace.
 */
function clientTemplateIds(): array
{
    $path = base_path('resources/js/pages/settings/print-settings/template-library/registry.ts');
    expect(file_exists($path))->toBeTrue("client registry missing at {$path}");

    preg_match_all("/^ {6}id: '(dz-[a-z0-9-]+)'/m", (string) file_get_contents($path), $matches);

    return array_values(array_unique($matches[1]));
}

it('ships every client template id from the backend', function () {
    $backendIds = array_keys(backendTemplates());
    $clientIds = clientTemplateIds();

    expect($clientIds)->not->toBeEmpty();

    $missing = array_values(array_diff($clientIds, $backendIds));

    expect($missing)->toBe([], sprintf(
        'Client offers template(s) the backend cannot install (POST /print-templates/library/%s -> 404): %s. Add them to TemplateLibraryService::$templates AND getMetadata().',
        '{id}',
        implode(', ', $missing)
    ));
});

it('keeps backend templates and metadata on the same id set', function () {
    $templateIds = array_keys(backendTemplates());
    $metadataIds = array_column(TemplateLibraryService::getMetadata(), 'id');

    $onlyTemplates = array_values(array_diff($templateIds, $metadataIds));
    $onlyMetadata = array_values(array_diff($metadataIds, $templateIds));

    expect($onlyTemplates)->toBe([], 'in $templates but not getMetadata(): ' . implode(', ', $onlyTemplates));
    expect($onlyMetadata)->toBe([], 'in getMetadata() but not $templates: ' . implode(', ', $onlyMetadata));
});

it('exposes identical ordering for templates and metadata', function () {
    expect(array_keys(backendTemplates()))->toBe(array_column(TemplateLibraryService::getMetadata(), 'id'));
});

it('uses only paper sizes the client PaperSize union can represent', function () {
    $templates = backendTemplates();
    $invalid = [];

    foreach ($templates as $id => $template) {
        if (! in_array($template['paper_size'], VALID_PAPER_SIZES, true)) {
            $invalid[] = "{$id} => {$template['paper_size']}";
        }
    }

    foreach (TemplateLibraryService::getMetadata() as $meta) {
        if (! in_array($meta['paper_size'], VALID_PAPER_SIZES, true)) {
            $invalid[] = "{$meta['id']} (metadata) => {$meta['paper_size']}";
        }
    }

    expect($invalid)->toBe([], 'invalid paper_size: ' . implode(', ', $invalid));
});

it('describes the sticker label with its real 40x20mm geometry', function () {
    $sticker = TemplateLibraryService::find('dz-sticker-label');

    expect($sticker)->not->toBeNull();
    expect($sticker['paper_size'])->toBe('40x20mm');
    expect($sticker['doc_type_code'])->toBe('STK');

    $meta = collect(TemplateLibraryService::getMetadata())->firstWhere('id', 'dz-sticker-label');
    expect($meta['paper_size'])->toBe('40x20mm');
});

it('ships the POS 80mm receipt as a partial override config', function () {
    $pos = TemplateLibraryService::find('dz-pos-receipt-80mm');

    expect($pos)->not->toBeNull();
    expect($pos['doc_type_code'])->toBe('POS');
    expect($pos['paper_size'])->toBe('80mm');
    expect($pos['is_active'])->toBeTrue();
    expect($pos['is_default'])->toBeFalse();

    // A partial override set: it carries only the keys the backend has always
    // carried, and fromApiResponse() supplies the rest from registry defaults.
    expect($pos['config'])->not->toBeEmpty();
    expect(array_key_exists('paper_width_mm', $pos['config']))->toBeTrue();
    expect(array_key_exists('show_qr', $pos['config']))->toBeTrue();
    expect(array_key_exists('rules', $pos['config']))->toBeTrue();
});

it('keeps a stable 5-field header on every backend template', function () {
    foreach (backendTemplates() as $id => $template) {
        expect($template)->toHaveKeys(['name', 'doc_type_code', 'paper_size', 'is_default', 'is_active', 'config'], "{$id} is missing a header field");
        expect($template['config'])->toBeArray();
    }
});

it('resolves find, exists, getConfig and getFlatPayload consistently', function () {
    foreach (array_keys(backendTemplates()) as $id) {
        expect(TemplateLibraryService::exists($id))->toBeTrue("exists({$id}) should be true");
        expect(TemplateLibraryService::find($id))->not->toBeNull("find({$id}) should not be null");
        expect(TemplateLibraryService::getConfig($id))->toBeArray("getConfig({$id}) should be an array");

        $flat = TemplateLibraryService::getFlatPayload($id);
        expect($flat)->toHaveKeys(['name', 'doc_type_code', 'paper_size', 'is_default', 'is_active', 'config']);
        expect($flat['config'])->toBe(TemplateLibraryService::getConfig($id));
    }
});

it('returns null for an unknown template id', function () {
    expect(TemplateLibraryService::exists('dz-does-not-exist'))->toBeFalse();
    expect(TemplateLibraryService::find('dz-does-not-exist'))->toBeNull();
    expect(TemplateLibraryService::getConfig('dz-does-not-exist'))->toBeNull();
    expect(TemplateLibraryService::getFlatPayload('dz-does-not-exist'))->toBeNull();
});
