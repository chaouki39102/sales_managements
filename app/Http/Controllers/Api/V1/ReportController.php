<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService)
    {
    }

    public function sales(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'party_id', 'fiscal_year_id', 'year_id']);
        if (!empty($filters['year_id']) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $filters['year_id'];
        }
        unset($filters['year_id']);
        $data = $this->reportService->salesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'party_id', 'fiscal_year_id', 'year_id']);
        if (!empty($filters['year_id']) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $filters['year_id'];
        }
        unset($filters['year_id']);
        $data = $this->reportService->purchasesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المشتريات بنجاح',
            'data' => $data,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->customersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الزبائن بنجاح',
            'data' => $data,
        ]);
    }

    public function suppliers(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->suppliersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الموردين بنجاح',
            'data' => $data,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $filters = $request->only(['family_id', 'brand_id']);
        $data = $this->reportService->productsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المنتجات بنجاح',
            'data' => $data,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $data = $this->reportService->inventoryReport();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المخزون بنجاح',
            'data' => $data,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'payment_mode_id']);
        $data = $this->reportService->paymentsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المدفوعات بنجاح',
            'data' => $data,
        ]);
    }

    public function velocity(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->velocityReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير سرعة البيع بنجاح',
            'data' => $data,
        ]);
    }

    public function margin(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->marginReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الهوامش بنجاح',
            'data' => $data,
        ]);
    }

    public function aging(Request $request): JsonResponse
    {
        $filters = $request->only(['as_of_date']);
        $data = $this->reportService->agingReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الديون بنجاح',
            'data' => $data,
        ]);
    }

    public function taxes(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->taxesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الضرائب بنجاح',
            'data' => $data,
        ]);
    }

    public function creative(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'year_id']);
        if (!empty($filters['year_id']) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $filters['year_id'];
        }
        unset($filters['year_id']);
        $data = $this->reportService->creativeReport($filters);

        return response()->json([
            'success' => true,
            'message' => 'تم جلب التقرير الشامل بنجاح',
            'data' => $data,
        ]);
    }

    public function daily(Request $request): JsonResponse
    {
        $filters = $request->only(['date']);
        $data = $this->reportService->dailyReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب التقرير اليومي بنجاح',
            'data' => $data,
        ]);
    }

    public function productMovement(Request $request): JsonResponse
    {
        $filters = $request->only(['product_id', 'from_date', 'to_date']);
        $data = $this->reportService->productMovementReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير حركة المنتجات بنجاح',
            'data' => $data,
        ]);
    }

    public function profitLoss(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'year_id']);
        if (!empty($filters['year_id']) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $filters['year_id'];
        }
        unset($filters['year_id']);
        $data = $this->reportService->profitLossReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الأرباح والخسائر بنجاح',
            'data' => $data,
        ]);
    }

    public function returns(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'from_date', 'to_date']);
        if (!empty($request->year_id) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $request->year_id;
        }
        $data = $this->reportService->returnsReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الإرجاعات بنجاح',
            'data' => $data,
        ]);
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'from_date', 'to_date']);
        if (!empty($request->year_id) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $request->year_id;
        }
        $data = $this->reportService->cashFlowReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير التدفقات النقدية بنجاح',
            'data' => $data,
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'from_date', 'to_date']);
        if (!empty($request->year_id) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $request->year_id;
        }
        $data = $this->reportService->expensesReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المصروفات بنجاح',
            'data' => $data,
        ]);
    }

    public function salesTrend(Request $request): JsonResponse
    {
        $filters = $request->only(['fiscal_year_id', 'from_date', 'to_date']);
        if (!empty($request->year_id) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $request->year_id;
        }
        $data = $this->reportService->salesTrendReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير اتجاهات المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $filters = $request->only(['product_id', 'warehouse_id', 'from_date', 'to_date']);
        $data = $this->reportService->stockMovementsReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير حركات المخزون بنجاح',
            'data' => $data,
        ]);
    }
}