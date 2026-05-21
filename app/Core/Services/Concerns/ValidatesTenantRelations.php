<?php
// app/Core/Services/Concerns/ValidatesTenantRelations.php

namespace App\Core\Services\Concerns;

use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * الطبقة 5 — حماية Foreign Keys من Cross-Tenant Injection
 *
 * المشكلة: المهاجم يرسل family_id=500 التابع لشركة B
 * في بيانات منتج من شركة A → ارتباط بيانات cross-tenant.
 *
 * الاستخدام في Service:
 *
 *   class ProductService extends BaseService
 *   {
 *       use ValidatesTenantRelations;
 *
 *       protected function beforeCreate(array $data, $request): array
 *       {
 *           $data = parent::beforeCreate($data, $request);
 *           $this->validateTenantRelations($data, $data['company_id'] ?? app(CompanyContextService::class)->get(), [
 *               'family_id' => 'families',
 *               'brand_id'  => 'brands',
 *               'unit_id'   => 'units',
 *           ]);
 *           return $data;
 *       }
 *   }
 */
trait ValidatesTenantRelations
{
    /**
     * تحقق أن كل foreign key في $data تابع لنفس $companyId
     *
     * @param array  $data       البيانات القادمة من الـ request
     * @param int    $companyId  معرّف الشركة الحالية
     * @param array  $relations  ['field_name' => 'table_name']
     *                           مثال: ['family_id' => 'families', 'brand_id' => 'brands']
     *
     * يتجاهل الحقول الغائبة أو الـ null تلقائياً — فقط القيم الموجودة تُتحقق منها
     */
    protected function validateTenantRelations(
        array $data,
        int   $companyId,
        array $relations
    ): void {
        foreach ($relations as $field => $table) {
            if (empty($data[$field])) {
                continue;
            }

            $exists = DB::table($table)
                ->where('id', $data[$field])
                ->where('company_id', $companyId)
                ->exists();

            if (!$exists) {
                throw new BusinessRuleException(
                    "القيمة المحددة للحقل [{$field}] غير موجودة أو تابعة لشركة أخرى.",
                    422
                );
            }
        }
    }

    /**
     * تحقق من قائمة IDs دفعة واحدة — لـ syncPrices / syncDiscounts وما شابهها
     *
     * @param array  $ids        قائمة الـ IDs المطلوب التحقق منها
     * @param string $table      اسم الجدول
     * @param int    $companyId  معرّف الشركة الحالية
     *
     * @throws BusinessRuleException إذا كان أي ID غير تابع للشركة
     */
    protected function validateTenantRelationsMany(
        array  $ids,
        string $table,
        int    $companyId
    ): void {
        if (empty($ids)) {
            return;
        }

        $ids = array_unique(array_filter($ids));

        $validCount = DB::table($table)
            ->whereIn('id', $ids)
            ->where('company_id', $companyId)
            ->count();

        if ($validCount !== count($ids)) {
            throw new BusinessRuleException(
                "بعض القيم المحددة في [{$table}] غير موجودة أو تابعة لشركة أخرى.",
                422
            );
        }
    }
}
