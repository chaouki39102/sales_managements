<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\SubsidizedSalesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SubsidizedSalesController extends Controller
{
    public function __construct(
        private readonly SubsidizedSalesService $subsidizedSalesService,
    ) {}

    public function summary(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');
            $month        = $request->integer('month');

            if (!$fiscalYearId) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id مطلوب'], 422);
            }

            $result = $this->subsidizedSalesService->getSummary(
                $company->id,
                $fiscalYearId,
                $month ?: null,
            );

            return response()->json([
                'status' => 'success',
                'data'   => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function compute(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');
            $month        = $request->integer('month');

            if (!$fiscalYearId) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id مطلوب'], 422);
            }

            $result = $this->subsidizedSalesService->computeSummary(
                $company->id,
                $fiscalYearId,
                $month ?: null,
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حساب الهامش والضريبة على المواد المدعمة',
                'data'    => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'qty_sold'           => 'nullable|numeric|min:0',
                'purchase_price_avg' => 'nullable|numeric|min:0',
                'actual_sell_price'  => 'nullable|numeric|min:0',
                'margin_per_unit'    => 'nullable|numeric|min:0',
                'total_margin'       => 'nullable|numeric|min:0',
                'ifu_base'           => 'nullable|numeric|min:0',
                'ifu_amount'         => 'nullable|numeric|min:0',
                'price_violation'    => 'nullable|boolean',
            ]);

            $result = $this->subsidizedSalesService->updateRow($id, $company->id, $validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'تم تحديث المادة المدعمة',
                'data'    => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $this->subsidizedSalesService->deleteRow($id, $company->id);

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حذف المادة المدعمة',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function violations(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');

            if (!$fiscalYearId) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id مطلوب'], 422);
            }

            $result = $this->subsidizedSalesService->getViolations($company->id, $fiscalYearId);

            return response()->json([
                'status' => 'success',
                'data'   => $result['rows'],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
