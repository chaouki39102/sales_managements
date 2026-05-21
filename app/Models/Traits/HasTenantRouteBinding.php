<?php
// app/Models/Traits/HasTenantRouteBinding.php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Model;

/**
 * الطبقة 3 — Route Model Binding آمن للـ Multi-Tenancy
 *
 * المشكلة: Laravel الافتراضي يستدعي Model::find($id) مباشرة عند implicit binding
 * مما يتجاوز CompanyScope → شركة A ترى بيانات شركة B بمعرفة الـ ID فقط.
 *
 * الحل: نعيد توجيه الـ binding عبر Query Builder ليمر بـ CompanyScope تلقائياً.
 *
 * الاستخدام: أضف هذا الـ Trait لكل موديل tenant له route مباشر.
 */
trait HasTenantRouteBinding
{
    /**
     * يُستدعى تلقائياً من Laravel عند implicit route model binding
     * بدلاً من: Model::find($value)
     * يصبح:    Model::query()->where('id', $value)->firstOrFail()
     * CompanyScope يطبق تلقائياً لأننا نمر عبر Query Builder ✅
     */
    public function resolveRouteBinding($value, $field = null): static
    {
        $field ??= $this->getRouteKeyName();

        return $this->resolveRouteBindingQuery(
            $this->newQuery(),
            $value,
            $field
        )->firstOrFail();
    }

    /**
     * للعلاقات المتداخلة مثل: /families/{family}/products/{product}
     * يضمن أن الـ child ينتمي لنفس tenant الـ parent
     */
    public function resolveChildRouteBinding($childType, $value, $field): ?Model
    {
        return parent::resolveChildRouteBinding($childType, $value, $field);
    }
}
