<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlanController extends Controller
{
    use ApiResponders;

    /**
     * قائمة الخطط المتاحة
     */
    public function index(Request $request): JsonResponse
    {
        $plans = collect(Company::PLANS)->map(function ($limits, $key) {
            return [
                'key'            => $key,
                'label'          => $limits['label'] ?? $key,
                'max_users'      => $limits['max_users'] ?? 0,
                'max_products'   => $limits['max_products'] ?? 0,
                'max_warehouses' => $limits['max_warehouses'] ?? 0,
            ];
        })->values();

        return $this->successResponse($plans, 'قائمة الخطط');
    }

    /**
     * عرض تفاصيل خطة محددة
     */
    public function show(string $plan): JsonResponse
    {
        $plans = Company::PLANS;
        if (!isset($plans[$plan])) {
            return $this->errorResponse('الخطة غير موجودة', 404, 'NOT_FOUND');
        }

        return $this->successResponse(
            array_merge(['key' => $plan], $plans[$plan]),
            'تفاصيل الخطة'
        );
    }

    public function store(Request $request): JsonResponse
    {
        return $this->errorResponse('الخطط مُعرَّفة في الكود — لا يمكن إنشاؤها ديناميكياً', 422, 'FEATURE_NOT_SUPPORTED');
    }

    public function update(Request $request, string $plan): JsonResponse
    {
        return $this->errorResponse('الخطط مُعرَّفة في الكود — لا يمكن تعديلها ديناميكياً', 422, 'FEATURE_NOT_SUPPORTED');
    }
}
