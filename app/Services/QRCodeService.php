<?php

namespace App\Services;

use App\Models\CommercialDocument;

class QRCodeService
{
    public function generateForDocument(CommercialDocument $document): string
    {
        return app(FiscalInvoiceQrService::class)->svgBase64($document);
    }

    public function getQRDataString(CommercialDocument $document): string
    {
        return app(FiscalInvoiceQrService::class)->dataString($document);
    }

    public function generateForUrl(string $url): string
    {
        $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(320)
            ->errorCorrection('M')
            ->margin(1)
            ->generate($url);

        return 'data:image/svg+xml;base64,' . base64_encode($qrCode);
    }

    public static function validateQRData(array $qrData): bool
    {
        return FiscalInvoiceQrService::validateData($qrData);
    }
}
