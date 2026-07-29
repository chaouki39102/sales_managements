<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class PdfExportController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'html' => 'required|string',
            'paper_size' => 'nullable|string|in:A4,A5,80mm,58mm',
            'orientation' => 'nullable|string|in:portrait,landscape',
            'margin_top' => 'nullable|numeric|min:0|max:50',
            'margin_bottom' => 'nullable|numeric|min:0|max:50',
            'margin_sides' => 'nullable|numeric|min:0|max:50',
            'filename' => 'nullable|string|max:255',
        ]);

        $paperSize = $validated['paper_size'] ?? 'A4';
        $orientation = $validated['orientation'] ?? 'portrait';

        $isThermal = $paperSize === '80mm' || $paperSize === '58mm';
        if ($isThermal) {
            $paperSize = [0, 0, $paperSize === '80mm' ? 302 : 219, 10000];
            $orientation = 'portrait';
        }

        $html = $validated['html'];

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper($paperSize, $orientation);
        $pdf->setOptions([
            'defaultFont' => 'dejavu sans',
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
        ]);

        if (isset($validated['margin_top'])) {
            $pdf->setOption('margin_top', $validated['margin_top']);
        }
        if (isset($validated['margin_bottom'])) {
            $pdf->setOption('margin_bottom', $validated['margin_bottom']);
        }
        if (isset($validated['margin_sides'])) {
            $pdf->setOption('margin_left', $validated['margin_sides']);
            $pdf->setOption('margin_right', $validated['margin_sides']);
        }

        $filename = $validated['filename'] ?? 'document.pdf';
        if (!str_ends_with($filename, '.pdf')) {
            $filename .= '.pdf';
        }

        return $pdf->download($filename);
    }
}
