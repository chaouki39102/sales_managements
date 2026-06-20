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

/**
 * DocumentComputeController
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Routes (أضف في api.php داخل group tenant):
 *
 *   POST   /{company}/documents/compute-line       → computeLine()
 *   POST   /{company}/documents/compute-totals     → computeTotals()
 *   POST   /{company}/documents/{document}/convert → convert()
 *   POST   /{company}/documents/{document}/return  → createReturn()
 *   GET    /{company}/documents/{document}/chain   → chain()
 *   GET    /{company}/parties/{party}/credit-check → creditCheck()
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
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

    // ══════════════════════════════════════════════════════════════════════════
    // compute-line
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /{company}/documents/compute-line
     *
     * يحسب كل تفاصيل سطر واحد: سعر، خصم، TVA، مخزون، أكوام، هامش، ائتمان.
     * يُستدعى من الفرونتند عند:
     *   - اختيار منتج جديد
     *   - تغيير الكمية أو التعبئة
     *   - تغيير الزبون (لتحديث TVA والائتمان)
     */
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

    /**
     * POST /{company}/documents/compute-totals
     *
     * يحسب إجماليات مستند كامل من مصفوفة الأسطر.
     * يُستخدَم للتحقق النهائي قبل الحفظ.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // Document Conversion
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /{company}/documents/{document}/convert
     *
     * يُحوِّل مستنداً لنوع آخر (DEV→BCC→BL→FV أو BCF→BR→FA).
     *
     * Body: { target_type_code: 'FV', include_line_ids?: [1,2,3] }
     * include_line_ids: اختياري — تحويل جزئي لأسطر محددة فقط
     */
    public function convert(Request $request, CommercialDocument $document): JsonResponse
    {
        try {
            $this->authorizeAction('update', $document);

            $validated = $request->validate([
                'target_type_code' => 'required|string|max:10',
                'include_line_ids' => 'nullable|array',
                'include_line_ids.*' => 'integer',
            ]);

            $newDocument = $this->conversionService->convert(
                $document,
                $validated['target_type_code'],
                $validated['include_line_ids'] ?? null,
            );

            return $this->successResponse(
                $newDocument->load(['documentType', 'documentStatus', 'party', 'lines.product']),
                "تم تحويل المستند إلى {$validated['target_type_code']} بنجاح"
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'convert');
        }
    }

    /**
     * GET /{company}/documents/{document}/chain
     *
     * يُرجع سلسلة المستندات المرتبطة (الأب، الأبناء، الأجداد).
     */
    public function chain(CommercialDocument $document): JsonResponse
    {
        try {
            $this->authorizeAction('view', $document);

            $chain = $this->conversionService->buildChain($document);

            return $this->successResponse($chain, 'تم جلب سلسلة المستندات');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'chain');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Document Return (مرتجع)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /{company}/documents/{document}/return
     *
     * ينشئ مستند مرتجع (AV لـFV، أو AA لـFA) مرتبطاً بالمستند الأصلي.
     *
     * Body: {
     *   reason: string,
     *   lines: [{ line_id: int, quantity: float }]
     * }
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // Credit Check
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * GET /{company}/parties/{partyId}/credit-check?amount=X&date=Y
     *
     * يتحقق من الائتمان المتاح للمتعامل ويُرجع حالة الائتمان.
     */
    public function creditCheck(Request $request, int $partyId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', \App\Models\Party::class);

            $amount = (float) $request->input('amount', 0);
            $date   = $request->input('date', now()->toDateString());

            $result = $this->creditCheckService->check($partyId, $amount, $date);

            return $this->successResponse($result, 'تم فحص الائتمان');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'creditCheck');
        }
    }
}
