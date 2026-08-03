<?php

namespace App\Http\Middleware;

use App\Models\PortalUser;
use App\Services\CompanyContextService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * PortalAuthenticate — مصادقة جلسة بوابة الزبائن
 *
 * ══════════════════════════════════════════════════════════════════
 * هذه وسيلة المصادقة الوحيدة للمسارات: /api/v1/portal/*
 *
 * - تقرأ توكن Bearer (أنشأه PortalAuthController::login عبر Sanctum).
 * - تتحقق أن الـ tokenable هو PortalUser فعلي (وليس User نظامي).
 * - تتحقق أن الحساب مفعّل وأن المؤسسة نشطة.
 * - عند النجاح: تضبط CompanyContextService (فيصبح كل النماذج ذات
 *   HasCompany مفلترة تلقائياً بشركة الزبون) وتضع الزبون في
 *   $request->_portal_user وتُسجله في auth() الحالي.
 *
 * ملاحظة مهمة: لا نتحقق من جدول company_user هنا — زبون البوابة ليس
 * عضواً في المؤسسة، بل زبون مربوط بـ party.
 * ══════════════════════════════════════════════════════════════════
 */
class PortalAuthenticate
{
    private ?PersonalAccessToken $accessToken = null;

    public function __construct(
        private readonly CompanyContextService $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $portal = $this->resolvePortalUser($request);

        if (!$portal || !$portal->is_active) {
            return $this->fail(
                401,
                'UNAUTHENTICATED',
                'جلسة البوابة غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.'
            );
        }

        $company = $portal->company()->first();

        if (!$company || !$company->active) {
            return $this->fail(
                403,
                'COMPANY_INACTIVE',
                'المؤسسة غير متاحة حالياً.'
            );
        }

        // فحص أمان إضافي: المؤسسة في الرابط {company} (يضبطها
        // portal.company) يجب أن تطابق مؤسسة زبون البوابة نفسه.
        $routeCompany = $request->input('_portal_company');
        if ($routeCompany && (int) $routeCompany->id !== (int) $company->id) {
            return $this->fail(
                403,
                'COMPANY_MISMATCH',
                'لا تملك صلاحية الوصول لهذه المؤسسة.'
            );
        }

        // تحديث آخر استخدام للتوكن (كل طلب)
        $this->accessToken?->forceFill(['last_used_at' => now()])->save();

        // ضبط سياق الشركة: من هنا تصبح كل استعلامات HasCompany مفلترة
        $this->context->set($company->id);

        $request->merge(['_portal_user' => $portal]);
        Auth::setUser($portal);

        return $next($request);
    }

    private function resolvePortalUser(Request $request): ?PortalUser
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $this->accessToken = PersonalAccessToken::findToken($token);
        if (!$this->accessToken) {
            return null;
        }

        $tokenable = $this->accessToken->tokenable;

        return $tokenable instanceof PortalUser ? $tokenable : null;
    }

    private function fail(int $status, string $code, string $message): Response
    {
        return response()->json([
            'status'    => 'error',
            'code'      => $code,
            'message'   => $message,
            'timestamp' => now()->toISOString(),
        ], $status);
    }
}
