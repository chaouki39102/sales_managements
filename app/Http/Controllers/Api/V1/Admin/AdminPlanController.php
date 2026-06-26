<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $counts = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        $plans = Plan::orderBy('sort_order')->get()->map(function ($plan) use ($counts) {
            return [
                'id'               => $plan->id,
                'key'              => $plan->key,
                'label'            => $plan->label,
                'description'      => $plan->description,
                'max_users'        => $plan->max_users,
                'max_products'     => $plan->max_products,
                'max_warehouses'   => $plan->max_warehouses,
                'is_active'        => $plan->is_active,
                'sort_order'       => $plan->sort_order,
                'companies_count'  => $counts[$plan->key] ?? 0,
            ];
        });

        return response()->json(['data' => $plans]);
    }

    public function show(int $planId): JsonResponse
    {
        $plan = Plan::findOrFail($planId);

        $count = DB::table('companies')
            ->whereNull('deleted_at')
            ->where('plan', $plan->key)
            ->count();

        return response()->json([
            'data' => array_merge($plan->toArray(), ['companies_count' => $count]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key'            => 'required|string|max:50|unique:plans,key',
            'label'          => 'required|string|max:100',
            'description'    => 'nullable|string|max:500',
            'max_users'      => 'required|integer|min:0',
            'max_products'   => 'required|integer|min:0',
            'max_warehouses' => 'required|integer|min:0',
            'is_active'      => 'boolean',
            'sort_order'     => 'integer|min:0',
        ]);

        $plan = Plan::create($data);

        return response()->json([
            'data' => $plan->fresh()
        ], 201);
    }

    public function update(Request $request, int $planId): JsonResponse
    {
        $plan = Plan::findOrFail($planId);

        $data = $request->validate([
            'key'            => 'sometimes|string|max:50|unique:plans,key,' . $plan->id,
            'label'          => 'sometimes|string|max:100',
            'description'    => 'nullable|string|max:500',
            'max_users'      => 'sometimes|integer|min:0',
            'max_products'   => 'sometimes|integer|min:0',
            'max_warehouses' => 'sometimes|integer|min:0',
            'is_active'      => 'boolean',
            'sort_order'     => 'integer|min:0',
        ]);

        $plan->update($data);

        return response()->json([
            'data' => $plan->fresh()
        ]);
    }

    public function destroy(int $planId): JsonResponse
    {
        $plan = Plan::findOrFail($planId);

        $companiesCount = DB::table('companies')->where('plan', $plan->key)->count();
        if ($companiesCount > 0) {
            return response()->json([
                'message' => "لا يمكن حذف الخطة، $companiesCount شركة (شركات) تستخدمها حالياً"
            ], 422);
        }

        $plan->delete();
        return response()->json(null, 204);
    }
}
