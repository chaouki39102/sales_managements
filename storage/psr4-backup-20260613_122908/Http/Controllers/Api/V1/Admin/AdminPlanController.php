<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPlanController extends Controller
{
    // تعريف الخطط الثابتة
    private const PLANS = [
        'free'         => ['label' => 'مجاني',    'max_users' => 1,   'max_products' => 100,   'max_warehouses' => 1],
        'starter'      => ['label' => 'مبتدئ',    'max_users' => 5,   'max_products' => 500,   'max_warehouses' => 1],
        'professional' => ['label' => 'احترافي',  'max_users' => 15,  'max_products' => 5000,  'max_warehouses' => 5],
        'enterprise'   => ['label' => 'مؤسسة',    'max_users' => 50,  'max_products' => 0,     'max_warehouses' => 20],
        'custom'       => ['label' => 'مخصص',     'max_users' => 0,   'max_products' => 0,     'max_warehouses' => 0],
    ];

    // GET /admin/plans
    public function index(): JsonResponse
    {
        // احسب عدد الشركات في كل خطة
        $counts = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        $plans = collect(self::PLANS)->map(function ($plan, $key) use ($counts) {
            return [
                'key'            => $key,
                'label'          => $plan['label'],
                'max_users'      => $plan['max_users'],
                'max_products'   => $plan['max_products'],
                'max_warehouses' => $plan['max_warehouses'],
                'companies_count'=> $counts[$key] ?? 0,
            ];
        })->values();

        return response()->json(['data' => $plans]);
    }

    // GET /admin/plans/{plan}
    public function show(string $plan): JsonResponse
    {
        if (!isset(self::PLANS[$plan])) {
            return response()->json(['message' => 'الخطة غير موجودة'], 404);
        }

        $count = DB::table('companies')
            ->whereNull('deleted_at')
            ->where('plan', $plan)
            ->count();

        return response()->json([
            'data' => array_merge(
                ['key' => $plan, 'companies_count' => $count],
                self::PLANS[$plan]
            ),
        ]);
    }

    // POST /admin/plans (للمستقبل — حالياً الخطط ثابتة)
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'الخطط ثابتة في هذا الإصدار'], 422);
    }

    // PUT /admin/plans/{plan}
    public function update(Request $request, string $plan): JsonResponse
    {
        return response()->json(['message' => 'الخطط ثابتة في هذا الإصدار'], 422);
    }
}
