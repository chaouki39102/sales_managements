<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CommercialDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * عرض الوثيقة العامة بالتوكن (بدون مصادقة).
 *
 * GET /api/v1/share/{token}
 * يعرض بيانات الوثيقة (رقم، تاريخ، أطراف، أسطر، إجماليات) بدون تسجيل دخول.
 * التوكن صالح لمدة 7 أيام من تاريخ الإنشاء (share_expires_at).
 */
class PublicDocumentShareController extends Controller
{
    public function __invoke(Request $request, string $token): JsonResponse
    {
        $document = CommercialDocument::with([
            'party',
            'documentType',
            'lines.product',
            'lines.product.unit',
            'lines.product.tva',
            'warehouse',
        ])
        ->where('share_token', $token)
        ->first();

        if (!$document) {
            return response()->json([
                'status'  => 'error',
                'message' => 'رابط المشاركة غير صالح أو انتهت صلاحيته.',
                'timestamp' => now()->toIso8601String(),
            ], 404);
        }

        if ($document->share_expires_at && $document->share_expires_at->isPast()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'انتهت صلاحية رابط المشاركة. يُرجى طلب رابط جديد من المسؤول.',
                'timestamp' => now()->toIso8601String(),
            ], 410);
        }

        $lines = $document->lines->map(fn($line) => [
            'id'               => $line->id,
            'product_name'     => $line->description ?? $line->product?->name ?? '',
            'product_ref'      => $line->product?->ref ?? null,
            'quantity'         => (float) $line->quantity,
            'unit_price_ht'    => (float) $line->unit_price_ht,
            'discount_percentage' => (float) $line->discount_percentage,
            'tva_rate'         => (float) $line->tva_rate,
            'total_ht'         => (float) $line->total_ht,
            'total_tva'        => (float) $line->total_tva,
            'total_ttc'        => (float) $line->total_ttc,
            'unit'             => $line->product?->unit?->abbreviation ?? null,
        ]);

        return response()->json([
            'status'    => 'success',
            'message'   => 'تم جلب بيانات الوثيقة بنجاح',
            'timestamp' => now()->toIso8601String(),
            'data'      => [
                'document_number'   => $document->document_number,
                'document_date'     => $document->document_date?->format('Y-m-d'),
                'due_date'          => $document->due_date?->format('Y-m-d'),
                'status'            => $document->documentStatus?->name ?? null,
                'party_name'        => $document->party?->name ?? null,
                'party_nif'         => $document->party?->nif ?? null,
                'party_phone'       => $document->party?->phone ?? null,
                'warehouse_name'    => $document->warehouse?->name ?? null,
                'document_type'     => $document->documentType?->name ?? null,
                'document_type_code'=> $document->documentType?->code ?? null,
                'reference'         => $document->reference ?? null,
                'notes'             => $document->notes ?? null,
                'lines'             => $lines,
                'total_ht'          => (float) $document->total_ht,
                'total_tva'         => (float) $document->total_tva,
                'total_discount'    => (float) $document->total_discount,
                'total_stamp'       => (float) $document->total_stamp,
                'total_ttc'         => (float) $document->total_ttc,
                'paid_amount'       => (float) $document->paid_amount,
                'remaining_amount'  => (float) $document->remaining_amount,
                'expires_at'        => $document->share_expires_at?->toIso8601String(),
            ],
        ]);
    }
}
