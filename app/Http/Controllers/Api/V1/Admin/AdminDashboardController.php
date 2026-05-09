<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    use ApiResponders;

    public function index(Request $request): JsonResponse
    {
        try {
            $stats = [
                'companies' => [
                    'total'     => Company::count(),
                    'active'    => Company::where('active', true)->where('is_suspended', false)->count(),
                    'suspended' => Company::where('is_suspended', true)->count(),
                    'verified'  => Company::whereNotNull('verified_at')->count(),
                    'by_plan'   => Company::groupBy('plan')
                        ->selectRaw('plan, count(*) as count')
                        ->pluck('count', 'plan'),
                ],
                'users' => [
                    'total'  => User::count(),
                    'active' => User::where('active', true)->count(),
                    'new_this_month' => User::whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->count(),
                ],
                'recent_companies' => Company::latest()
                    ->take(5)
                    ->with('owner:id,name,email')
                    ->get(['id', 'name', 'slug', 'plan', 'active', 'created_at', 'owner_id']),
                'recent_users' => User::latest()
                    ->take(5)
                    ->withCount('companies')
                    ->get(['id', 'name', 'email', 'active', 'created_at']),
            ];

            return $this->successResponse($stats, 'إحصائيات النظام');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل جلب الإحصائيات', 500, 'SERVER_ERROR');
        }
    }
}
