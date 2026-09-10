<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\Company;
use App\Support\ArabicGlyphShaper;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\Options;
use Illuminate\Support\Facades\View;

/**
 * Server-side PDF rendering of a commercial document (A4 invoice) via dompdf.
 *
 * The whole rendered HTML passes through ArabicGlyphShaper::shape() BEFORE
 * dompdf parses it because the PHP engines bundled with barryvdh/laravel-dompdf
 * do not shape Arabic themselves — without shaping, Arabic letters render as
 * isolated forms and never join, producing broken-looking text.
 *
 * The PDF stays remote-resource-free (no <img src="http..."> is ever resolved):
 * company party avatars are intentionally not embedded here. This keeps
 * generation fast and side-effect-free so emails never block on network.
 */
class DocumentPrintService
{
    public function generatePdf(CommercialDocument $document): string
    {
        $document->loadMissing([
            'documentType',
            'party',
            'warehouse',
            'currency',
            'documentStatus',
            'user',
            'lines' => fn ($q) => $q->orderBy('line_order'),
            'lines.product',
            'lines.product.unit',
            'payments.paymentMode',
        ]);

        $company = Company::find($document->company_id);

        $html = View::make('documents.pdf', [
            'document' => $document,
            'company'  => $company,
        ])->render();

        $html = ArabicGlyphShaper::shape($html);

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOptions([
            'defaultFont'         => 'dejavu sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
        ]);
        $pdf->setOption('margin_top', 12);
        $pdf->setOption('margin_bottom', 14);
        $pdf->setOption('margin_left', 12);
        $pdf->setOption('margin_right', 12);

        return $pdf->output();
    }
}