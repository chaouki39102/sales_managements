<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\Log;

class CompanyService extends \App\Core\Services\BaseService
{
    protected string $model        = Company::class;
    protected string $resourceName = 'company';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'company';
    }

    public function __construct(private ?CompanyContextService $context = null) {}

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
        }
        $data['owner_id']  = auth()->id();
        $data['active'] = $data['active'] ?? true;
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // ربط المالك بالشركة في الجدول الوسيط
        $ownerId = $data['owner_id'] ?? auth()->id();

        DB::table('company_user')->insertOrIgnore([
            'user_id'    => $ownerId,
            'company_id' => $item->id,
            'role'       => 'owner',
            'active'     => true,
            'is_default' => true,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // باقي المهام (بذر الأدوار وتعيين دور admin للمالك) يتولاها CompanyObserver تلقائياً
        Log::info("Company created: {$item->name}, owner: {$ownerId}");
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        Log::info("New company created: {$item->name} by User#" . auth()->id());
    }

    // ═══════════════════════════════════════════
    // تبديل السياق — switchContext
    // ═══════════════════════════════════════════

    public function switchContext(User $user, Company $company): void
    {
        // ① super-admin يتجاوز كل التحقق — لديه صلاحية الوصول لأي شركة
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            $this->applyContext($user, $company);
            return;
        }

        // ② التحقق من العضوية النشطة للمستخدمين العاديين
        $membership = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->first();

        if (!$membership) {
            throw new BusinessRuleException(
                'أنت لست عضواً في هذه الشركة.',
                403
            );
        }

        if (!$membership->active) {
            throw new BusinessRuleException(
                'حسابك معطّل داخل هذه الشركة. تواصل مع المسؤول.',
                403
            );
        }

        if (!$company->active) {
            throw new BusinessRuleException(
                'هذه الشركة غير مفعّلة حالياً.',
                403
            );
        }

        $this->applyContext($user, $company);
    }

    /**
     * تطبيق السياق فعلياً بعد التحقق
     */
    private function applyContext(User $user, Company $company): void
    {
        // ضبط CompanyContextService
        if (!$this->context) {
            $this->context = app(CompanyContextService::class);
        }
        $this->context->set($company->id);

        // تحديث is_default في الـ pivot (إن كان المستخدم عضواً)
        $isMember = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->exists();

        if ($isMember) {
            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->update(['is_default' => true]);

            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', '!=', $company->id)
                ->update(['is_default' => false]);
        }

        // تحديث company_id في جدول users
        $user->update(['company_id' => $company->id]);
    }

    // ═══════════════════════════════════════════
    // دوال مساعدة
    // ═══════════════════════════════════════════

    public function getUserCompanies()
    {
        return auth()->user()->companies()->get();
    }

    public function getMembers(Company $company)
    {
        return $company->users()
            ->withPivot(['role', 'active', 'joined_at'])
            ->get();
    }

    public function getStats(): array
    {
        return [
            'total_companies'     => Company::count(),
            'active_companies'    => Company::active()->count(),
            'suspended_companies' => Company::suspended()->count(),
            'verified_companies'  => Company::verified()->count(),
            'on_trial_companies'  => Company::onTrial()->count(),
            'plans_distribution'  => Company::select('plan', DB::raw('COUNT(*) as total'))
                ->groupBy('plan')
                ->pluck('total', 'plan')
                ->toArray(),
        ];
    }
}
