<?php
// app/Models/Traits/HasCompany.php
namespace App\Models\Traits;

use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasCompany
{
    /**
     * يُستدعى تلقائياً عند boot() للنموذج
     * اسم الدالة bootHasCompany() هو اتفاقية Laravel للـ Traits
     */
    protected static function bootHasCompany(): void
    {
        // 1. تطبيق الـ Global Scope على كل query
        static::addGlobalScope(new CompanyScope());

        // 2. تعيين company_id تلقائياً عند الإنشاء
        static::creating(function (self $model): void {
            if (empty($model->company_id)) {
                $context = app(CompanyContextService::class);
                if ($context->has()) {
                    $model->company_id = $context->get();
                }
            }
        });
    }

    // ===== Relations =====

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // ===== Scopes =====

    /**
     * تجاهل فلتر الشركة — للتقارير الموحدة أو Super Admin
     */
    public function scopeAllCompanies(Builder $query): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * جلب بيانات شركة محددة بغض النظر عن السياق الحالي
     */
    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope(CompanyScope::class)
                     ->where($this->getTable() . '.company_id', $companyId);
    }
}
