<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $summary = $this->dashboardService->getSummary();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب بيانات لوحة التحكم بنجاح',
            'data' => $summary,
        ]);
    }

    public function salesChart(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month');
        $data = $this->dashboardService->getSalesChart($period);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب بيانات المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function topProducts(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getTopProducts($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب المنتجات الأكثر مبيعاً بنجاح',
            'data' => $data,
        ]);
    }

    public function topCustomers(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getTopCustomers($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب أفضل الزبائن بنجاح',
            'data' => $data,
        ]);
    }

    public function recentTransactions(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getRecentTransactions($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب المعاملات الأخيرة بنجاح',
            'data' => $data,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $data = $this->dashboardService->getInventorySummary();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب ملخص المخزون بنجاح',
            'data' => $data,
        ]);
    }

    public function topDebtors(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getTopDebtors($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب المدينين بنجاح',
            'data' => $data,
        ]);
    }
}