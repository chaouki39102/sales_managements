<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;

/**
 * Company Service
 *
 * مسؤول عن جميع عمليات إدارة الشركات:
 * - إنشاء شركة جديدة وربطها بالمالك
 * - إدارة تبديل السياق (Multi-Tenancy) بالتعاون مع CompanyContextService
 * - جلب أعضاء الشركة وأدوارهم
 * - توفير إحصائيات عامة للـ Super Admin
 *
 * @package App\Services
 */
class CompanyService extends \App\Core\Services\BaseService
{
    protected string $model = Company::class;
    protected string $resourceName = 'company';
    protected array $defaultWith = [];

    /**
     * CompanyService constructor.
     * يحقن CompanyContextService للتحكم في سياق الشركة النشطة.
     *
     * @param CompanyContextService|null $context
     */
    public function __construct(private ?CompanyContextService $context = null)
    {
        parent::__construct(); // لضمان توافق أي منطق في BaseService مستقبلاً
    }

    // ═══════════════════════════════════════════════════════════
    // Hooks (تجاوزات BaseService)
    // ═══════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        // توليد slug فريد تلقائياً إن لم يُقدم
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
        }

        // تعيين المالك والمعلومات الأساسية
        $data['owner_id'] = auth()->id();
        $data['is_active'] = $data['is_active'] ?? true;

        return $data;
    }

    /**
     * بعد إنشاء الشركة (داخل Transaction)
     * يربط المستخدم المالك بالشركة عبر الـ Pivot.
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        $user = auth()->user();
        if ($user && !$user->companies->contains($item->id)) {
            // إرفاق المستخدم وضبطه كافتراضي لهذه الشركة
            $user->companies()->attach($item->id, [
                'is_default' => true,
                'role' => Company::COMPANY_ROLE_OWNER // 'owner'
            ]);
        }
    }

    /**
     * بعد Commit: عمليات خارجية (مثل إرسال إيميل ترحيبي)
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: إرسال بريد ترحيب للمالك
        Log::info("New company created: {$item->name} by User#" . auth()->id());
    }

    // ═══════════════════════════════════════════════════════════
    // دوال عامة مساعدة
    // ═══════════════════════════════════════════════════════════

    /**
     * جلب شركات المستخدم الحالي فقط.
     */
    public function getUserCompanies()
    {
        return auth()->user()->companies()->get();
    }

    // ═══════════════════════════════════════════════════════════
    // إدارة السياق المتعدد (Multi-Tenancy Context)
    // ═══════════════════════════════════════════════════════════

    /**
     * تبديل السياق إلى شركة معينة.
     *
     * يتحقق من عضوية المستخدم، ثم يضبط CompanyContextService ويُحدِّث
     * الشركة الافتراضية للمستخدم.
     *
     * @param User    $user    المستخدم الحالي
     * @param Company $company الشركة المستهدفة
     * @throws BusinessRuleException إذا لم يكن المستخدم عضواً نشطاً
     */
    public function switchContext(User $user, Company $company): void
    {
        // 1. التحقق من العضوية النشطة
        if (!$user->companies()
                ->where('companies.id', $company->id) // نحدد الجدول للأمان
                ->wherePivot('is_active', true)
                ->exists()) {
            throw new BusinessRuleException('أنت لست عضواً نشطاً في هذه الشركة، أو أن حسابك معطل داخلها.', 403);
        }

        // 2. ضبط السياق العام للتطبيق
        //    نضمن حقن CompanyContextService عبر الخاصية، أو نحصل عليه من الـ Container
        if (!$this->context) {
            $this->context = app(CompanyContextService::class);
        }
        $this->context->set($company->id);

        // 3. تحديث الشركة الافتراضية للمستخدم (لتجربة سلسة عند تسجيل الدخول القادم)
        //    نجعل الشركة الحالية هي الـ default، ونلغي default عن باقي شركاته.
        $user->companies()->updateExistingPivot($company->id, ['is_default' => true]);
        $user->companies()
            ->where('companies.id', '!=', $company->id) // يجب تحديد الجدول
            ->update(['is_default' => false]);
    }

    // ═══════════════════════════════════════════════════════════
    // إدارة الأعضاء
    // ═══════════════════════════════════════════════════════════

    /**
     * جلب أعضاء شركة معينة مع أدوارهم وحالتهم.
     *
     * @param Company $company
     * @return \Illuminate\Support\Collection
     */
    public function getMembers(Company $company)
    {
        return $company->users()
            ->withPivot(['role', 'is_active', 'joined_at'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════
    // إحصائيات (لـ Super Admin فقط)
    // ═══════════════════════════════════════════════════════════

    /**
     * إحصائيات عامة عن كل الشركات في النظام.
     *
     * @return array
     */
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
// }
