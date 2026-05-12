<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $companiesTotal     = DB::table('companies')->whereNull('deleted_at')->count();
        $companiesActive    = DB::table('companies')->whereNull('deleted_at')->where('active', true)->whereNull('suspended_at')->count();
        $companiesSuspended = DB::table('companies')->whereNull('deleted_at')->whereNotNull('suspended_at')->count();
        $companiesVerified  = DB::table('companies')->whereNull('deleted_at')->whereNotNull('verified_at')->count();

        $byPlan = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        $usersTotal        = DB::table('users')->whereNull('deleted_at')->count();
        $usersActive       = DB::table('users')->whereNull('deleted_at')->where('active', true)->count();
        $usersNewThisMonth = DB::table('users')
            ->whereNull('deleted_at')
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();

        $recentCompanies = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'slug', 'email', 'phone', 'plan', 'active', 'suspended_at', 'verified_at', 'owner_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($co) {
                $co->users_count = DB::table('company_user')->where('company_id', $co->id)->where('active', true)->count();
                $co->is_suspended = !is_null($co->suspended_at);
                $co->owner = $co->owner_id
                    ? DB::table('users')->where('id', $co->owner_id)->select('id', 'name', 'email')->first()
                    : null;
                return $co;
            });

        $recentUsers = DB::table('users')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'email', 'active', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'companies' => [
                    'total'     => $companiesTotal,
                    'active'    => $companiesActive,
                    'suspended' => $companiesSuspended,
                    'verified'  => $companiesVerified,
                    'by_plan'   => $byPlan,
                ],
                'users' => [
                    'total'          => $usersTotal,
                    'active'         => $usersActive,
                    'new_this_month' => $usersNewThisMonth,
                ],
                'recent_companies' => $recentCompanies,
                'recent_users'     => $recentUsers,
            ],
        ]);
    }
}
