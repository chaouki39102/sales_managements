<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\User;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// ═══════════════════════════════════════════════════════════════════════
// AdminImpersonateController
//
// السوبر أدمن يدخل كأي مستخدم آخر دون معرفة كلمة مروره.
// يُخزَّن ID الأدمن الأصلي في session لإمكانية العودة.
// ═══════════════════════════════════════════════════════════════════════
class AdminImpersonateController extends BaseApiController
{
    public function start(User $user): JsonResponse
    {
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            return $this->errorResponse('لا يمكن انتحال هوية مدير النظام', 422);
        }

        try {
            // حفظ token الأدمن الأصلي في session
            $adminToken = auth()->user()->currentAccessToken()->token ?? null;
            session(['impersonating_as' => $user->id, 'admin_token' => $adminToken]);

            // إنشاء token مؤقت للمستخدم المستهدف
            $token = $user->createToken('impersonate_' . auth()->id(), ['impersonated'])->plainTextToken;

            return $this->successResponse([
                'token'      => $token,
                'user'       => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ],
                'message'    => "أنت تتصفح النظام كـ [{$user->name}]",
            ], 'تم الدخول بهوية المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'impersonate.start');
        }
    }

    public function stop(): JsonResponse
    {
        try {
            // حذف token الانتحال
            auth()->user()->tokens()->where('name', 'like', 'impersonate_%')->delete();
            session()->forget(['impersonating_as', 'admin_token']);

            return $this->successResponse(null, 'تم العودة لحسابك الأصلي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'impersonate.stop');
        }
    }

    protected function getModelClass(): string { return User::class; }
}


// ═══════════════════════════════════════════════════════════════════════
// AdminDashboardController
//
// إحصائيات شاملة لكل النظام — نقطة البداية للأدمن.
// ═══════════════════════════════════════════════════════════════════════
class AdminDashboardController extends BaseApiController
{
    public function index(): JsonResponse
    {
        try {
            $stats = [
                'companies' => [
                    'total'     => Company::count(),
                    'active'    => Company::where('is_active', true)->where('is_suspended', false)->count(),
                    'suspended' => Company::where('is_suspended', true)->count(),
                    'verified'  => Company::whereNotNull('verified_at')->count(),
                    'by_plan'   => Company::groupBy('plan')
                        ->selectRaw('plan, count(*) as count')
                        ->pluck('count', 'plan'),
                ],
                'users' => [
                    'total'  => User::count(),
                    'active' => User::where('is_active', true)->count(),
                    'new_this_month' => User::whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->count(),
                ],
                'recent_companies' => Company::latest()
                    ->take(5)
                    ->with('owner:id,name,email')
                    ->get(['id', 'name', 'slug', 'plan', 'is_active', 'created_at', 'owner_id']),
                'recent_users' => User::latest()
                    ->take(5)
                    ->withCount('companies')
                    ->get(['id', 'name', 'email', 'is_active', 'created_at']),
            ];

            return $this->successResponse($stats, 'إحصائيات النظام');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'dashboard');
        }
    }

    protected function getModelClass(): string { return Company::class; }
}
