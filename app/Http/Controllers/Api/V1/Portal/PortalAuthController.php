<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\Portal\PortalLoginRequest;
use App\Models\Company;
use App\Models\Party;
use App\Models\PortalUser;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PortalAuthController extends BaseApiController
{
    protected string $resourceName = 'portal';
    protected ?string $resourceClass = null;

    public function __construct(
        private CompanyContextService $context,
    ) {
        parent::__construct();
    }

    public function login(PortalLoginRequest $request): JsonResponse
    {
        try {
            // تسجيل الدخول مُقيَّد بمؤسسة الرابط {company}: نفس البريد
            // يمكن أن يوجد في عدة مؤسسات، ولكل زبون بوابته الخاصة.
            $companyId = (int) $this->context->get();

            $accounts = PortalUser::query()
                ->where('company_id', $companyId)
                ->where('email', $request->email)
                ->orderBy('id')
                ->get();

            if ($accounts->count() > 1) {
                return $this->errorResponse('يوجد أكثر من حساب بهذا البريد الإلكتروني. تواصل مع المؤسسة.', 422, 'MULTIPLE_ACCOUNTS');
            }

            $portal = $accounts->first();

            if (! $portal || ! Hash::check($request->password, $portal->password)) {
                return $this->errorResponse('بيانات الدخول غير صحيحة', 401, 'INVALID_CREDENTIALS');
            }

            if (! $portal->is_active) {
                return $this->errorResponse('تم تعطيل حساب البوابة لهذا الزبون. تواصل مع المؤسسة.', 403, 'ACCOUNT_DISABLED');
            }

            $company = Company::query()->find($portal->company_id);
            if (! $company || ! $company->active) {
                return $this->errorResponse('المؤسسة غير متاحة حالياً.', 403, 'COMPANY_INACTIVE');
            }

            $portal->forceFill(['last_login_at' => now()])->saveQuietly();

            return $this->successResponse([
                'portal_user' => $this->portalUserPayload($portal, $company),
                'token'       => $portal->createToken('portal_token')->plainTextToken,
                'token_type'  => 'Bearer',
            ], 'تم دخولك إلى بوابة الزبائن بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.login');
        }
    }

    public function me(Request $request): JsonResponse
    {
        try {
            $portal  = $request->input('_portal_user');
            $company = Company::query()->find($portal->company_id);

            return $this->successResponse($this->portalUserPayload($portal, $company), 'تم استرجاع بيانات الجلسة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.me');
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $request->input('_portal_user')?->tokens()->delete();

            return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.logout');
        }
    }

    protected function portalUserPayload(PortalUser $portal, ?Company $company): array
    {
        $party = Party::query()->find($portal->party_id);

        return [
            'id'        => $portal->id,
            'name'      => $portal->name,
            'email'     => $portal->email,
            'is_active' => $portal->is_active,
            'last_login_at' => optional($portal->last_login_at)->toISOString(),
            'company'   => $company ? [
                'id'              => $company->id,
                'name'            => $company->name,
                'commercial_name' => $company->commercial_name,
                'slug'            => $company->slug,
                'nif'             => $company->nif,
                'phone'           => $company->phone,
                'email'           => $company->email,
                'address'         => $company->address,
                'avatar'          => $company->avatar,
            ] : null,
            'party'     => $party ? [
                'id'           => $party->id,
                'name'         => $party->name,
                'code'         => $party->code,
                'nif'          => $party->nif,
                'credit_limit' => (float) $party->credit_limit,
                'credit_days'  => $party->credit_days,
            ] : null,
        ];
    }

    protected function getService(): mixed
    {
        return null;
    }

    protected function getModelClass(): string
    {
        return PortalUser::class;
    }
}
