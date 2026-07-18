<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        // ── Companies ──────────────────────────────────────────────
        $companiesTotal     = DB::table('companies')->whereNull('deleted_at')->count();
        $companiesActive    = DB::table('companies')->whereNull('deleted_at')->where('active', true)->whereNull('suspended_at')->count();
        $companiesSuspended = DB::table('companies')->whereNull('deleted_at')->whereNotNull('suspended_at')->count();
        $companiesVerified  = DB::table('companies')->whereNull('deleted_at')->whereNotNull('verified_at')->count();
        $companiesUnverified = $companiesTotal - $companiesVerified;

        $byPlan = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        // ── Users ──────────────────────────────────────────────────
        $usersTotal        = DB::table('users')->whereNull('deleted_at')->count();
        $usersActive       = DB::table('users')->whereNull('deleted_at')->where('active', true)->count();
        $usersNewThisMonth = DB::table('users')
            ->whereNull('deleted_at')
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();
        $usersPendingApproval = DB::table('users')
            ->whereNull('deleted_at')
            ->where('is_approved', false)
            ->count();

        $byRole = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->whereNull('roles.company_id')
            ->where('roles.name', '!=', 'super-admin')
            ->select('roles.name', DB::raw('count(*) as total'))
            ->groupBy('roles.name')
            ->pluck('total', 'name')
            ->toArray();

        // ── Growth trend (last 7 days) ─────────────────────────────
        $growthDays = collect(range(6, 0))->map(function ($i) {
            $date = now()->subDays($i)->startOfDay();
            return [
                'date'      => $date->format('Y-m-d'),
                'companies' => DB::table('companies')->whereNull('deleted_at')
                    ->whereDate('created_at', $date)->count(),
                'users'     => DB::table('users')->whereNull('deleted_at')
                    ->whereDate('created_at', $date)->count(),
            ];
        });

        // ── Companies nearing limits ───────────────────────────────
        $atRiskCompanies = collect();
        $allCompanies = DB::table('companies')
            ->whereNull('deleted_at')
            ->where('active', true)
            ->select('id', 'name', 'plan', 'max_users')
            ->get();

        $companyCounts = DB::table('company_user')
            ->where('active', true)
            ->whereIn('company_id', $allCompanies->pluck('id')->toArray())
            ->select('company_id', DB::raw('count(*) as cnt'))
            ->groupBy('company_id')
            ->pluck('cnt', 'company_id')
            ->toArray();

        foreach ($allCompanies as $co) {
            $limit = $co->max_users ?: (Company::PLANS[$co->plan]['max_users'] ?? 3);
            $count = $companyCounts[$co->id] ?? 0;
            if ($limit > 0 && $count >= $limit * 0.8) {
                $atRiskCompanies->push([
                    'id'        => $co->id,
                    'name'      => $co->name,
                    'plan'      => $co->plan,
                    'current'   => $count,
                    'max'       => $limit,
                    'pct'       => round(($count / $limit) * 100),
                ]);
            }
        }
        $atRiskCompanies = $atRiskCompanies->sortByDesc('pct')->values()->take(5);

        // ── Recent activity ────────────────────────────────────────
        $recentActivity = DB::table('audits')
            ->join('users', 'users.id', '=', 'audits.auditable_id')
            ->select(
                'audits.id', 'audits.event', 'audits.created_at',
                'users.name as user_name', 'users.email as user_email',
                'audits.auditable_type', 'audits.new_values'
            )
            ->orderByDesc('audits.created_at')
            ->limit(8)
            ->get()
            ->map(function ($row) {
                $vals = is_string($row->new_values) ? json_decode($row->new_values, true) : $row->new_values;
                $row->company_id = $vals['company_id'] ?? null;
                unset($row->new_values);
                return $row;
            });

        // Batch recent_companies — no N+1
        $recentCompanies = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'slug', 'email', 'phone', 'plan', 'active', 'suspended_at', 'verified_at', 'owner_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $companyIds = $recentCompanies->pluck('id')->toArray();
        $ownerIds   = $recentCompanies->pluck('owner_id')->filter()->values()->toArray();

        $usersCounts = DB::table('company_user')
            ->whereIn('company_id', $companyIds)
            ->where('active', true)
            ->select('company_id', DB::raw('count(*) as total'))
            ->groupBy('company_id')
            ->pluck('total', 'company_id')
            ->toArray();

        $owners = [];
        if ($ownerIds) {
            $ownerRows = DB::table('users')->whereIn('id', $ownerIds)->select('id', 'name', 'email')->get();
            foreach ($ownerRows as $row) {
                $owners[$row->id] = $row;
            }
        }

        $recentCompanies = $recentCompanies->map(function ($co) use ($usersCounts, $owners) {
            $co->users_count  = $usersCounts[$co->id] ?? 0;
            $co->is_suspended = !is_null($co->suspended_at);
            $co->owner        = $co->owner_id ? ($owners[$co->owner_id] ?? null) : null;
            return $co;
        });

        $recentUsers = DB::table('users')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'email', 'active', 'is_approved', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // ── System health ──────────────────────────────────────────
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $dbSize = DB::select("SELECT ROUND(page_count * page_size / 1048576, 1) AS size_mb FROM pragma_page_count(), pragma_page_size()")[0]->size_mb ?? 0;
        } else {
            $dbSize = DB::select("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS size_mb FROM information_schema.tables WHERE table_schema = '" . env('DB_DATABASE') . "'")[0]->size_mb ?? 0;
        }

        $systemHealth = [
            'php_version'      => PHP_VERSION,
            'laravel_version'  => app()->version(),
            'db_size_mb'       => $dbSize,
            'cache_driver'     => config('cache.default'),
            'queue_driver'     => config('queue.default'),
            'queue_pending'    => DB::table('jobs')->count(),
            'queue_failed'     => DB::table('failed_jobs')->count(),
            'maintenance_mode' => App()->isDownForMaintenance(),
            'disk_free_gb'     => round(disk_free_space('/') / 1073741824, 1),
        ];

        return response()->json([
            'data' => [
                'companies' => [
                    'total'      => $companiesTotal,
                    'active'     => $companiesActive,
                    'suspended'  => $companiesSuspended,
                    'verified'   => $companiesVerified,
                    'unverified' => $companiesUnverified,
                    'by_plan'    => $byPlan,
                ],
                'users' => [
                    'total'          => $usersTotal,
                    'active'         => $usersActive,
                    'new_this_month' => $usersNewThisMonth,
                    'pending_approval' => $usersPendingApproval,
                    'by_role'        => $byRole,
                ],
                'recent_companies' => $recentCompanies,
                'recent_users'     => $recentUsers,
                'recent_activity'  => $recentActivity,
                'growth_7d'        => $growthDays,
                'at_risk_companies' => $atRiskCompanies,
                'system_health'    => $systemHealth,
            ],
        ]);
    }
}
