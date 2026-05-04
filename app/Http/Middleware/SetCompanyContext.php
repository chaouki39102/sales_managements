<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Models\User;
use App\Services\CompanyContextService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetCompanyContext
{
    public function __construct(
        private readonly CompanyContextService $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // 1. جلب slug من الـ route
        $slug = $request->route('company');
        if (!$slug) {
            abort(404);
        }

        // 2. جلب الشركة
        $company = Company::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        // 3. التحقق من صلاحية المستخدم
        /** @var User $user */
        $user = Auth::user();

        // ③-أ Super Admin: يتجاوز كل التحقق — له صلاحية الوصول لأي شركة
        if (!$user->hasRole(User::ROLE_SUPER_ADMIN)) {

            // ③-ب المستخدمون العاديون: يجب أن يكونوا أعضاء نشطين
            $membership = \Illuminate\Support\Facades\DB::table('company_user')
                ->where('user_id',    $user->id)
                ->where('company_id', $company->id)
                ->first();

            if (!$membership) {
                abort(403, 'ليس لديك صلاحية الوصول لهذه المؤسسة.');
            }

            if (!$membership->is_active) {
                abort(403, 'حسابك معطّل داخل هذه المؤسسة. تواصل مع المسؤول.');
            }
        }

        // 4. تعيين السياق
        $this->context->set($company->id);

        // 5. تحديث آخر شركة نشطة للمستخدم
        $user->update(['company_id' => $company->id]);

        // 6. مشاركة الشركة مع الـ Views والـ Request
        view()->share('currentCompany', $company);
        $request->merge(['_company' => $company]);

        return $next($request);
    }
}
