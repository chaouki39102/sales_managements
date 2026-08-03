<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Services\CompanyContextService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SetPortalCompanyContext — ضبط سياق المؤسسة لمسارات بوابة الزبائن
 *
 * ══════════════════════════════════════════════════════════════════
 * يعمل على المسارات: /api/v1/{company}/portal/*
 *
 * - يحلّ {company} (slug) إلى مؤسسة نشطة ويضبط CompanyContextService.
 * - لا يتطلب User نظامي ولا عضوية في company_user — زبون البوابة ليس
 *   عضواً في المؤسسة (نفس مبدأ PortalAuthenticate).
 * - يضع المؤسسة في $request->_portal_company ليستعملها PortalAuthenticate
 *   كفحص أمان إضافي (تأكيد أن المؤسسة في الرابط تطابق مؤسسة زبون البوابة).
 * ══════════════════════════════════════════════════════════════════
 */
class SetPortalCompanyContext
{
    public function __construct(
        private readonly CompanyContextService $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // SubstituteBindings قد يُحوِّل {company} إلى Company Model
        $raw = $request->route()->originalParameter('company') ?? $request->route('company');

        if (!$raw) {
            abort(404);
        }

        if ($raw instanceof Company) {
            $company = $raw;
            if (!$company->active) {
                abort(404);
            }
        } else {
            // الرابط المخصص (portal_slug) أولاً، ثم slug الداخلي (توافق رجعي).
            // منع التصادم مضمون في التحقق من portal_slug (فريد + لا يصطدم بأي slug).
            $company = Company::where('active', true)
                ->where(fn ($q) => $q
                    ->where('portal_slug', $raw)
                    ->orWhere('slug', $raw))
                ->firstOrFail();
        }

        $this->context->set($company->id);
        $request->merge(['_portal_company' => $company]);

        return $next($request);
    }
}
