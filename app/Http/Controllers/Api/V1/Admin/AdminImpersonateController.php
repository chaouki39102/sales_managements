<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminImpersonateController extends Controller
{
    use ApiResponders;

    /**
     * بدء جلسة impersonation كمستخدم آخر
     */
    public function start(User $user): JsonResponse
    {
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            return $this->errorResponse('لا يمكن انتحال هوية مدير النظام', 422, 'AUTHORIZATION_ERROR');
        }

        try {
            $adminToken = auth()->user()->currentAccessToken()->token ?? null;
            session(['impersonating_as' => $user->id, 'admin_token' => $adminToken]);

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
            return $this->errorResponse('فشل انتحال الهوية', 500, 'SERVER_ERROR');
        }
    }

    /**
     * إنهاء جلسة impersonation والعودة للحساب الأصلي
     */
    public function stop(): JsonResponse
    {
        try {
            auth()->user()->tokens()->where('name', 'like', 'impersonate_%')->delete();
            session()->forget(['impersonating_as', 'admin_token']);

            return $this->successResponse(null, 'تم العودة لحسابك الأصلي');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الخروج', 500, 'SERVER_ERROR');
        }
    }
}
