<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;

/**
 * SuperAdminOnly Middleware
 *
 * يُستخدم حصراً على مسارات /api/v1/admin/...
 * لا يحتاج SetCompanyContext لأن السوبر أدمن يتجاوز سياق الشركة.
 */
class SuperAdminOnly
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || !$user->hasRole(User::ROLE_SUPER_ADMIN)) {
            return response()->json([
                'success' => false,
                'message' => 'هذه العملية مقتصرة على مدير النظام فقط.',
            ], 403);
        }

        return $next($request);
    }
}
