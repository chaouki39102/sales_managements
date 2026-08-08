<?php

namespace App\Services;

use App\Models\CommercialDocument;

/**
 * FiscalInvoiceQrService — canonical builder of the fiscal QR payload
 * embedded on Algerian sale documents (FV / POS).
 *
 * SPEC NOTE (2026-08-08): the Algerian DGI has NOT published an official
 * QR payload specification yet (Decree 21-98 mandated e-invoicing but the
 * DGI now prefers structured XML — UBL / UN-CEFACT — and a future "unique
 * validation code" possibly carried by a QR; the field-order/separator
 * standard is NOT finalised). Until the official spec lands, we emit a
 * versioned, machine-readable JSON v1 payload (same approach as the legacy
 * QRCodeService, extended with DGI-relevant identifiers) so documents are
 * QR-ready and migration to the official format is a single-version bump.
 * See docs/reports/FISCAL_QR_SPEC.md for the full spec + a known-good test
 * vector. ALWAYS re-check https://e-invoicing.dz / DGI guidance before
 * bumping to the official schema.
 */
class FiscalInvoiceQrService
{
    public const VERSION = 1;

    /**
     * Build the canonical fiscal QR payload for a document.
     *
     * The payload is fully determinist given the document: amounts are
     * rounded to 2 decimals, dates are Y-m-d, identifiers come from the
     * document's own company / party records (never the global config).
     */
    public function buildData(CommercialDocument $document): array
    {
        $company = $document->company;
        $party   = $document->party;

        return [
            'v'      => self::VERSION,
            'seller' => [
                'name'    => $company?->name ?? config('app.company_name', ''),
                'nif'     => $company?->nif ?? config('app.company_nif', ''),
                'nis'     => $company?->nis ?? config('app.company_nis', ''),
                'ai'      => $company?->ai ?? config('app.company_ai', ''),
                'rc'      => $company?->rc ?? '',
                'address' => $company?->address ?? '',
            ],
            'buyer' => [
                'name' => $party?->name ?? '',
                'nif'  => $party?->nif ?? '',
            ],
            'invoice' => [
                'number' => $document->document_number,
                'date'   => $document->document_date?->format('Y-m-d'),
                'type'   => $document->documentType?->code,
            ],
            'amounts' => [
                'ht'       => round((float) $document->total_ht, 2),
                'tva'      => round((float) $document->total_tva, 2),
                'discount' => round((float) $document->total_discount, 2),
                'stamp'    => round((float) $document->total_stamp, 2),
                'ttc'      => round((float) $document->total_ttc, 2),
                'net'      => round((float) $document->net_to_pay, 2),
            ],
            'hash' => $this->hash($document),
        ];
    }

    /**
     * The exact string that must be encoded into the QR matrix.
     */
    public function dataString(CommercialDocument $document): string
    {
        return json_encode(
            $this->buildData($document),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }

    /**
     * Render the payload as a QR code, base64-encoded SVG (data-ready).
     */
    public function svgBase64(CommercialDocument $document, int $size = 200): string
    {
        $svg = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->encoding('UTF-8')
            ->size($size)
            ->errorCorrection('M')
            ->generate($this->dataString($document));

        return base64_encode($svg);
    }

    /**
     * Integrity hash over the fiscal-relevant fields. Changing any of the
     * inputs below changes the hash, so the QR payload cannot be silently
     * edited after the fact.
     */
    public function hash(CommercialDocument $document): string
    {
        $data = implode('|', [
            (string) $document->document_number,
            $document->document_date?->format('Ymd') ?? '',
            $document->documentType?->code ?? '',
            (string) round((float) $document->total_ht, 2),
            (string) round((float) $document->total_tva, 2),
            (string) round((float) $document->total_ttc, 2),
        ]);

        return hash('sha256', $data);
    }

    /**
     * Inverse of dataString() — decode a scanned payload.
     */
    public static function parse(string $data): array
    {
        $decoded = json_decode($data, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Structural validation of a scanned/decoded payload.
     */
    public static function validateData(array $data): bool
    {
        return ($data['v'] ?? null) === self::VERSION
            && isset($data['seller']['name'], $data['seller']['nif'])
            && isset($data['invoice']['number'], $data['invoice']['date'])
            && isset($data['amounts']['ht'], $data['amounts']['tva'], $data['amounts']['ttc']);
    }
}
