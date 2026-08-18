<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Models\User;
use App\Services\CompanyContextService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetCompanyContext
{
    public function __construct(
        private readonly CompanyContextService $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // 1. جلب slug من الـ route
        // SubstituteBindings قد يُحوِّل {company} إلى Company Model قبل وصولنا
        // لذا نتعامل مع الحالتين: raw slug أو Model جاهز
        $raw = $request->route()->originalParameter('company') ?? $request->route('company');

        if (!$raw) {
            abort(404);
        }

        // 2. جلب الشركة
        if ($raw instanceof Company) {
            $company = $raw;
            if (!$company->active) {
                abort(404);
            }
        } else {
            $company = Company::where('slug', $raw)
                ->where('active', true)
                ->first();

            if (!$company) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'المؤسسة غير موجودة أو معطّلة.',
                    'code'    => 'COMPANY_NOT_FOUND',
                ], 404);
            }
        }

        /** @var User $user */
        $user = Auth::user();

        // 3. Super Admin يتجاوز كل قيود العضوية
        if (!$user->hasRole(User::ROLE_SUPER_ADMIN)) {
            $membership = DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->first();

            if (!$membership) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'ليس لديك صلاحية الوصول لهذه المؤسسة.',
                    'code'    => 'COMPANY_NO_MEMBERSHIP',
                ], 403);
            }

            if (!$membership->active) {
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
