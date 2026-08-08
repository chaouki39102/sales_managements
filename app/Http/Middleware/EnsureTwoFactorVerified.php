<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureTwoFactorVerified
 * ══════════════════════════════════════════════════════════════════
 * تطبيق إلزامي للمصادقة الثنائية على مستوى الجلسة — طبقة دفاع إضافية:
 * أي توكن Sanctum صدر قبل تفعيل 2FA (two_factor_enabled_at) يُعتبر
 * منتهي الصلاحية فوراً — يُحذف ويُرفض الطلب بـ 401، فيُجبر المتصفح
 * على إعادة تسجيل الدخول مروراً بخطوة رمز 2FA.
 *
 * النقاط الرئيسية:
 *  - الحماية الأساسية في TwoFactorAuthService::enable(): تفعيل 2FA
 *    يُلغي كل التوكنات الموجودة، لذا لا يبقى أي توكن سابق حياً.
 *  - هذا الوسيط دفاعٌ احتياطي لأي توكن صدر قبل التفعيل بوسائل أخرى
 *    (قارنة صارمة lt(): التوكن المتزامن مع التفعيل لا يُرفض خطأً).
 *  - يوضع بعد auth:sanctum، لذا $request->user() و currentAccessToken()
 *    متاحان دائماً؛ المستخدمون بدون 2FA أو جلسات stateful يمررون مباشرة.
 *  - المسارات العامة (login / two-factor/confirm / portal) خارج auth:sanctum
 *    وبالتالي لا تتأثر بهذا الفحص.
 * ══════════════════════════════════════════════════════════════════
 */
class EnsureTwoFactorVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->two_factor_enabled) {
            $token     = $user->currentAccessToken();
            $enabledAt = $user->two_factor_enabled_at;

            if ($token && $enabledAt && $token->created_at?->lt($enabledAt)) {
                $token->delete();

                return response()->json([
                    'status'  => 'error',
                    'message' => 'انتهت صلاحية الجلسة بعد تفعيل المصادقة الثنائية — يُرجى إعادة تسجيل الدخول.',
                    'code'    => 'TWO_FACTOR_REQUIRED',
                ], 401);
            }
        }

        return $next($request);
    }
}
