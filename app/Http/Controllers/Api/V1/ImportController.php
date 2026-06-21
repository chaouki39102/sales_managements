<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\CompanyContextService;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportController extends BaseApiController
{
    public function __construct(
        private ImportService $importService,
        private CompanyContextService $companyContext,
    ) {}

    private function getCompanyId(): int
    {
        return $this->companyContext->get() ?? throw new \RuntimeException('Company context not set');
    }

    // ═════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ═════════════════════════════════════════════════════════════════

    public function previewProducts(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', \App\Models\Product::class);
            $rows = $request->input('rows', []);
            if (empty($rows)) {
                return $this->errorResponse('لا توجد بيانات للاستيراد', null, 422);
            }
            $result = $this->importService->validateProducts($rows, $this->getCompanyId());
            return $this->successResponse($result, 'تم التحقق من البيانات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'previewProducts');
        }
    }

    public function executeProducts(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', \App\Models\Product::class);
            $rows = $request->input('rows', []);
            if (empty($rows)) {
                return $this->errorResponse('لا توجد بيانات للاستيراد', null, 422);
            }
            $userId = $request->user()?->id;
            $pendingEntities = $request->input('pending_entities');
            $result = $this->importService->importProducts($rows, $this->getCompanyId(), $userId, $pendingEntities);
            return $this->successResponse($result, 'تم استيراد المنتجات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'executeProducts');
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // PARTIES
    // ═════════════════════════════════════════════════════════════════

    public function previewParties(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', \App\Models\Party::class);
            $rows = $request->input('rows', []);
            if (empty($rows)) {
                return $this->errorResponse('لا توجد بيانات للاستيراد', null, 422);
            }
            $result = $this->importService->validateParties($rows, $this->getCompanyId());
            return $this->successResponse($result, 'تم التحقق من البيانات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'previewParties');
        }
    }

    public function executeParties(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', \App\Models\Party::class);
            $rows = $request->input('rows', []);
            if (empty($rows)) {
                return $this->errorResponse('لا توجد بيانات للاستيراد', null, 422);
            }
            $userId = $request->user()?->id;
            $pendingEntities = $request->input('pending_entities');
            $result = $this->importService->importParties($rows, $this->getCompanyId(), $userId, $pendingEntities);
            return $this->successResponse($result, 'تم استيراد الأطراف بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'executeParties');
        }
    }
}
