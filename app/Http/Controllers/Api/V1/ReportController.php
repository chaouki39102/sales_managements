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

    private function prepareFilters(Request $request, array $keys): array
    {
        $filters = $request->only(array_merge($keys, ['fiscal_year_id', 'year_id']));
        if (!empty($filters['year_id']) && empty($filters['fiscal_year_id'])) {
            $filters['fiscal_year_id'] = $filters['year_id'];
        }
        unset($filters['year_id']);
        return $filters;
    }

    public function sales(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'party_id']);
        $data = $this->reportService->salesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'party_id']);
        $data = $this->reportService->purchasesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المشتريات بنجاح',
            'data' => $data,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->customersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الزبائن بنجاح',
            'data' => $data,
        ]);
    }

    public function suppliers(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->suppliersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الموردين بنجاح',
            'data' => $data,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'family_id', 'brand_id', 'warehouse_id']);
        $data = $this->reportService->productsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المنتجات بنجاح',
            'data' => $data,
        ]);
    }

    public function forecast(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['horizon', 'from_date', 'to_date']);
        $data = $this->reportService->forecastReport($filters);

        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير التنبؤ وإعادة الطلب بنجاح',
            'data' => $data,
        ]);
    }

    public function monthly(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->monthlyReport($filters);

        return response()->json([
            'success' => true,
            'message' => 'تم جلب التقرير الشهري بنجاح',
            'data' => $data,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->dashboardReport($filters);

        return response()->json([
            'success' => true,
            'message' => 'تم جلب لوحة القيادة بنجاح',
            'data' => $data,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['as_of_date', 'family_id', 'warehouse_id', 'low_stock', 'out_of_stock']);
        $data = $this->reportService->inventoryReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المخزون بنجاح',
            'data' => $data,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'payment_mode_id']);
        $data = $this->reportService->paymentsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المدفوعات بنجاح',
            'data' => $data,
        ]);
    }

    public function velocity(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->velocityReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير سرعة البيع بنجاح',
            'data' => $data,
        ]);
    }

    public function margin(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->marginReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الهوامش بنجاح',
            'data' => $data,
        ]);
    }

    public function aging(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['as_of_date', 'from_date', 'to_date']);
        $data = $this->reportService->agingReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الديون بنجاح',
            'data' => $data,
        ]);
    }

    public function taxes(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->taxesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الضرائب بنجاح',
            'data' => $data,
        ]);
    }

    public function creative(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->creativeReport($filters);

        return response()->json([
            'success' => true,
            'message' => 'تم جلب التقرير الشامل بنجاح',
            'data' => $data,
        ]);
    }

    public function daily(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['date']);
        $data = $this->reportService->dailyReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب التقرير اليومي بنجاح',
            'data' => $data,
        ]);
    }

    public function productMovement(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['product_id', 'from_date', 'to_date']);
        $data = $this->reportService->productMovementReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير حركة المنتجات بنجاح',
            'data' => $data,
        ]);
    }

    public function profitLoss(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->profitLossReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الأرباح والخسائر بنجاح',
            'data' => $data,
        ]);
    }

    public function returns(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->returnsReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الإرجاعات بنجاح',
            'data' => $data,
        ]);
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->cashFlowReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير التدفقات النقدية بنجاح',
            'data' => $data,
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->expensesReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المصروفات بنجاح',
            'data' => $data,
        ]);
    }

    public function salesTrend(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->salesTrendReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير اتجاهات المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['product_id', 'warehouse_id', 'from_date', 'to_date']);
        $data = $this->reportService->stockMovementsReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير حركات المخزون بنجاح',
            'data' => $data,
        ]);
    }

    public function salesMatrix(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'family_id', 'brand_id']);
        $data = $this->reportService->matrixReport($filters, 'sale');
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المبيعات حسب المنتج والزبون بنجاح',
            'data' => $data,
        ]);
    }

    public function purchasesMatrix(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'family_id', 'brand_id']);
        $data = $this->reportService->matrixReport($filters, 'purchase');
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المشتريات حسب المنتج والمورد بنجاح',
            'data' => $data,
        ]);
    }

    public function matrixDetail(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['mode', 'party_id', 'product_id', 'from_date', 'to_date']);
        $data = $this->reportService->matrixDetail($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تفاصيل الخلية بنجاح',
            'data' => $data,
        ]);
    }

    public function clientMonthly(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date']);
        $data = $this->reportService->clientMonthlyReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب رقم الأعمال الشهري حسب الزبون بنجاح',
            'data' => $data,
        ]);
    }

    public function grandLivre(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['from_date', 'to_date', 'party_id', 'party_type_id']);
        $data = $this->reportService->grandLivreReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب دفتر الأستاذ العام بنجاح',
            'data' => $data,
        ]);
    }

    public function productHistory(Request $request): JsonResponse
    {
        $filters = $this->prepareFilters($request, ['product_id', 'from_date', 'to_date']);
        $data = $this->reportService->productHistoryReport($filters);
        return response()->json([
            'success' => true,
            'message' => 'تم جلب سجل حركة المنتج بنجاح',
            'data' => $data,
        ]);
    }
}
