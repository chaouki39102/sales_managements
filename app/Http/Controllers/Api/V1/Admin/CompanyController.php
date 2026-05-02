<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin Company Controller
 *
 * جميع العمليات هنا مقتصرة على Super Admin فقط.
 * يمدد BaseApiController لاستخدام أدوات الاستجابة الموحدة ومعالجة الأخطاء.
 */
class CompanyController extends BaseApiController
{
    protected string $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(private CompanyService $companyService)
    {
        parent::__construct();
    }

    /**
     * إحصائيات عامة عن كل الشركات
     */
    public function stats(): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            return $this->successResponse(
                $this->companyService->getStats(),
                'إحصائيات جميع الشركات'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'stats');
        }
    }

    public function suspend(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['reason' => 'required|string|max:500']);
            $company->suspend($data['reason'], auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تعليق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unsuspend();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم رفع التعليق عن شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function deactivate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->deactivate(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إيقاف تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivate');
        }
    }

    public function activate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->activate();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إعادة تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activate');
        }
    }

    public function verify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->verify(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم توثيق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unverify();
            return $this->successResponse(null, 'تم إلغاء توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);
            $customLimits = array_filter([
                'max_users'      => $data['max_users'] ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products'] ?? null,
            ]);
            $company->upgradePlan($data['plan'], $customLimits ?: null);
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تغيير خطة [{$company->name}] إلى {$data['plan']}"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePlan');
        }
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['notes' => 'nullable|string|max:5000']);
            $company->update(['notes' => $data['notes']]);
            return $this->successResponse(null, 'تم تحديث الملاحظات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateNotes');
        }
    }

    // ======================  تجاوز (override) getService() و getModelClass() ======================
    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }
}
