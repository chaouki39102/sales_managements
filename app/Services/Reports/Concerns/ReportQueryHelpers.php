<?php

namespace App\Services\Reports\Concerns;

use App\Services\CompanyContextService;
use Illuminate\Support\Facades\DB;

/**
 * Shared constants and query helpers for the report classes behind
 * App\Services\ReportService (moved verbatim from that class).
 */
trait ReportQueryHelpers
{
    private const SALE_CODES = ['FV', 'AV', 'POS'];
    private const PURCHASE_CODES = ['FA', 'AA'];
    private const AR_MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    private function companyId(): int
    {
        return (int) app(CompanyContextService::class)->get();
    }

    private function canViewCost(): bool
    {
        return (bool) auth()->user()?->can('view_cost_price');
    }

    /**
     * يرفق أسطر كل وثيقة (تفاصيل التفاصيل) بقائمة الوثائق المبنية مسبقاً.
     * يُستخدم لإظهار تفاصيل قابلة للطي في تقارير المبيعات/المشتريات/الإرجاعات/اليومي.
     * يشمل المنتجات اليدوية (product_id IS NULL): تُعرض بالوصف مع is_manual/ref «يدوي».
     */
    private function attachDocumentLines(array $docsArray, \Illuminate\Support\Collection $documents): array
    {
        $docIds = $documents->pluck('id');
        $linesByDoc = collect();
        if ($docIds->isNotEmpty()) {
            $linesByDoc = DB::table('commercial_document_lines as cdl')
                ->leftJoin('products as p', 'p.id', '=', 'cdl.product_id')
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    'cdl.product_id',
                    'cdl.description',
                    'p.name as catalog_product_name',
                    'p.ref as catalog_product_ref',
                    'cdl.quantity',
                    'cdl.unit_price_ht',
                    'cdl.discount_percentage',
                    'cdl.discount_amount',
                    'cdl.discount_amount_per_unit',
                    'cdl.total_discount_amount',
                    'cdl.tva_rate',
                    'cdl.total_ht',
                    'cdl.total_tva',
                    'cdl.total_ttc',
                    'cdl.packaging_units_snapshot'
                )
                ->orderBy('cdl.id')
                ->get()
                ->groupBy('commercial_document_id');
        }

        return array_map(function ($doc) use ($linesByDoc) {
            $doc['lines'] = ($linesByDoc->get($doc['id']) ?? collect())
                ->map(function ($l) {
                    $isManual = $l->product_id === null || $l->product_id === '';
                    $name = $isManual
                        ? (trim((string) ($l->description ?? '')) ?: 'منتج يدوي')
                        : ($l->catalog_product_name ?? '—');
                    $ref = $isManual ? 'يدوي' : ($l->catalog_product_ref ?? '—');

                    return [
                        'product_id'               => $l->product_id !== null ? (int) $l->product_id : null,
                        'is_manual'                => $isManual,
                        'product_name'             => $name,
                        'product_ref'              => $ref,
                        'quantity'                 => (float) $l->quantity,
                        'unit_price_ht'            => round((float) $l->unit_price_ht, 2),
                        'discount_percentage'      => (float) $l->discount_percentage,
                        'discount_amount'          => (float) $l->discount_amount,
                        'discount_amount_per_unit' => (float) $l->discount_amount_per_unit,
                        'total_discount_amount'    => round((float) $l->total_discount_amount, 2),
                        'tva_rate'                 => (float) $l->tva_rate,
                        'total_ht'                 => round((float) $l->total_ht, 2),
                        'total_tva'                => round((float) $l->total_tva, 2),
                        'total_ttc'                => round((float) $l->total_ttc, 2),
                        'pack_qty'                 => $l->packaging_units_snapshot ? (float) $l->packaging_units_snapshot : null,
                    ];
                })->values()->toArray();
            return $doc;
        }, $docsArray);
    }
}
