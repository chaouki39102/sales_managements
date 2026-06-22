<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use App\Models\DocumentTypeConversion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentTypeConversionController extends Controller
{
    public function index(): JsonResponse
    {
        $items = DocumentTypeConversion::query()
            ->orderBy('source_code')
            ->orderBy('display_order')
            ->get();

        return response()->json([
            'data' => $items,
        ]);
    }

    public function documentTypes(): JsonResponse
    {
        $items = DocumentType::query()
            ->where('active', true)
            ->orderBy('code')
            ->get(['code', 'name']);

        return response()->json([
            'data' => $items,
        ]);
    }

    public function allowedTargets(string $sourceCode): JsonResponse
    {
        // ⚠️ Laravel passes route params positionally, not by name.
        // {company} (prefix) is the FIRST param so we MUST get sourceCode from the route.
        $src = (string) request()->route()->parameter('sourceCode');

        $companyId = app(\App\Services\CompanyContextService::class)->get();

        $targetCodes = DocumentTypeConversion::query()
            ->where('source_code', $src)
            ->orderBy('display_order')
            ->pluck('target_code');

        $types = DocumentType::query()
            ->whereIn('code', $targetCodes)
            ->orderBy('code')
            ->get(['code', 'name']);

        return response()->json([
            'company_id' => $companyId,
            'source' => $src,
            'data' => $types,
        ]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversions'             => 'required|array',
            'conversions.*.id'        => 'nullable|integer|exists:document_type_conversions,id',
            'conversions.*.source_code' => 'required|string|max:10',
            'conversions.*.target_code' => 'required|string|max:10',
            'conversions.*.display_order' => 'nullable|integer|min:0',
        ]);

        $companyId = app(\App\Services\CompanyContextService::class)->get();

        DB::transaction(function () use ($validated, $companyId) {
            $ids = [];
            foreach ($validated['conversions'] as $row) {
                $conversion = DocumentTypeConversion::updateOrCreate(
                    ['id' => $row['id'] ?? null],
                    [
                        'company_id'    => $companyId,
                        'source_code'   => $row['source_code'],
                        'target_code'   => $row['target_code'],
                        'display_order' => $row['display_order'] ?? 0,
                    ]
                );
                $ids[] = $conversion->id;
            }

            // Remove rows that were not included in this update
            DocumentTypeConversion::where('company_id', $companyId)
                ->whereNotIn('id', $ids)
                ->delete();
        });

        return response()->json(['message' => 'تم حفظ خريطة التحويل.']);
    }
}
