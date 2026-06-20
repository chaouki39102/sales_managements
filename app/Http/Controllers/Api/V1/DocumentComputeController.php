<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\ComputeLineRequest;
use App\Models\CommercialDocument;
use App\Models\DocumentType;
use App\Services\ComputeLineService;
use App\Services\DocumentConversionService;
use App\Services\DocumentReturnService;
use App\Services\CreditCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentComputeController extends BaseApiController
{
    public function __construct(
        private ComputeLineService       $computeLineService,
        private DocumentConversionService $conversionService,
        private DocumentReturnService     $returnService,
        private CreditCheckService        $creditCheckService,
    ) {
        parent::__construct();
    }

    public function computeLine(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_id'     => 'required|integer|exists:products,id',
                'quantity'       => 'required|numeric|min:0.001',
                'packaging_id'   => 'nullable|integer',
                'price_level_id' => 'nullable|integer',
                'warehouse_id'   => 'nullable|integer',
                'party_id'       => 'nullable|integer',
                'is_purchase'    => 'nullable|boolean',
                'document_date'  => 'nullable|date',
            ]);

            $result = $this->computeLineService->compute($validated);

            return $this->successResponse($result, 'تم الحساب بنجاح');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'computeLine');
        }
    }

    public function computeTotals(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'lines'        => 'required|array|min:1',
                'lines.*'      => 'array',
                'apply_stamp'  => 'nullable|boolean',
            ]);

            $companyId = app(\App\Services\CompanyContextService::class)->get();
            $result    = $this->computeLineService->computeDocument(
                $validated['lines'],
                $validated['apply_stamp'] ?? false,
                $companyId,
            );

            return $this->successResponse($result, 'تم حساب الإجماليات');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'computeTotals');
        }
    }

    public function convert(Request $request): JsonResponse
    {
        try {
            $documentId = (int) $request->route('document');
            $document   = CommercialDocument::findOrFail($documentId);

            $this->authorizeAction('update', $document);

            $validated = $request->validate([
                'target_type_code'  => 'required|string|max:10',
                'document_date'     => 'nullable|date',
                'include_line_ids'  => 'nullable|array',
                'include_line_ids.*' => 'integer',
            ]);

            \Log::debug('[convert] received document_date:', ['raw' => $request->input('document_date'), 'validated' => $validated['document_date'] ?? null]);

            $newDocument = $this->conversionService->convert(
                $document,
                $validated['target_type_code'],
                $validated['include_line_ids'] ?? null,
                $validated['document_date'] ?? null,
            );

            return $this->successResponse(
                $newDocument->load(['documentType', 'documentStatus', 'party', 'lines.product']),
                "تم تحويل المستند إلى {$validated['target_type_code']} بنجاح"
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'convert');
        }
    }

    public function chain(Request $request): JsonResponse
    {
        try {
            $documentId = (int) $request->route('document');
            $document   = CommercialDocument::findOrFail($documentId);

            $this->authorizeAction('view', $document);

            $chain = $this->conversionService->buildChain($document);

            return $this->successResponse($chain, 'تم جلب سلسلة المستندات');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'chain');
        }
    }

    public function createReturn(Request $request, CommercialDocument $document): JsonResponse
    {
        try {
            $this->authorizeAction('update', $document);

            $validated = $request->validate([
                'reason'          => 'required|string|max:500',
                'lines'           => 'required|array|min:1',
                'lines.*.line_id' => 'required|integer',
                'lines.*.quantity'=> 'required|numeric|min:0.001',
            ]);

            $returnDoc = $this->returnService->createReturn(
                $document,
                $validated['lines'],
                $validated['reason'],
            );

            return $this->successResponse(
                $returnDoc->load(['documentType', 'documentStatus', 'lines.product']),
                'تم إنشاء مستند المرتجع بنجاح'
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'createReturn');
        }
    }

    public function creditCheck(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', \App\Models\Party::class);

            $partyId = (int) $request->route('party');
            $amount  = (float) $request->input('amount', 0);
            $date    = $request->input('date', now()->toDateString());

            $result = $this->creditCheckService->check($partyId, $amount, $date);

            return $this->successResponse($result, 'تم فحص الائتمان');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'creditCheck');
        }
    }
}
