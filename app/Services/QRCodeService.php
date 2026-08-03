<?php

namespace App\Services;

use App\Models\CommercialDocument;

class QRCodeService
{
    public function generateForDocument(CommercialDocument $document): string
    {
        $data = $this->buildQRData($document);
        
        $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(200)
            ->errorCorrection('M')
            ->generate($data);

        return base64_encode($qrCode);
    }

    public function getQRDataString(CommercialDocument $document): string
    {
        return $this->buildQRData($document);
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

    private function buildQRData(CommercialDocument $document): string
    {
        $supplier = $document->party;
        
        $qrData = [
            'supplier' => [
                'name' => config('app.company_name', 'Company Name'),
                'address' => config('app.company_address', ''),
                'nif' => config('app.company_nif', ''),
                'nis' => config('app.company_nis', ''),
                'ai' => config('app.company_ai', ''),
            ],
            'invoice' => [
                'number' => $document->document_number,
                'date' => $document->document_date?->format('Y-m-d'),
                'type' => $document->documentType?->code,
            ],
            'customer' => [
                'name' => $supplier?->name ?? '',
                'nif' => $supplier?->nif ?? '',
            ],
            'amounts' => [
                'ht' => round($document->total_ht ?? 0, 2),
                'tva' => round($document->total_tva ?? 0, 2),
                'ttc' => round($document->total_ttc ?? 0, 2),
                'stamp' => round($document->total_stamp ?? 0, 2),
            ],
            'hash' => $this->generateHash($document),
        ];

        return json_encode($qrData, JSON_UNESCAPED_UNICODE);
    }

    private function generateHash(CommercialDocument $document): string
    {
        $data = 
            ($document->document_number ?? '') .
            ($document->document_date?->format('Ymd') ?? '') .
            round($document->total_ttc ?? 0, 2) .
            round($document->total_tva ?? 0, 2);

        return hash('sha256', $data);
    }

    public static function validateQRData(array $qrData): bool
    {
        return isset($qrData['invoice']['number'], $qrData['invoice']['date']);
    }
}