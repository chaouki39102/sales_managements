<?php
// app/Http/Middleware/SetCompanyContext.php
namespace App\Http\Middleware;

use App\Models\Company;
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
        // 1. جلب slug الشركة من الـ route
        $slug = $request->route('company');

        if (! $slug) {
            abort(404);
        }

        // 2. جلب الشركة
        $company = Company::where('slug', $slug)
                          ->where('is_active', true)
                          ->firstOrFail();

        // 3. التحقق من صلاحية المستخدم
        $user = Auth::user();
        if (! $user->companies()->where('companies.id', $company->id)->exists()) {
            abort(403, 'ليس لديك صلاحية الوصول لهذه المؤسسة.');
        }

        // 4. تعيين السياق في الـ Service (يعمل مع HTTP + Queue + CLI)
        $this->context->set($company->id);

        // 5. تحديث آخر شركة نشطة للمستخدم
        $user->update(['company_id' => $company->id]);

        // 6. مشاركة الشركة مع جميع الـ Views
        view()->share('currentCompany', $company);

        // 7. إضافة company للـ request (مفيد في Controllers)
        $request->merge(['_company' => $company]);

        return $next($request);
    }
}
