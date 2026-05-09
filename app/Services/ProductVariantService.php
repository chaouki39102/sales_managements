<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Barcode;
use App\Core\Services\BaseService;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductVariantService extends BaseService
{
    protected string $model = ProductVariant::class;

    protected function getResourceName(): string
    {
        return 'product_variant';
    }

    /**
     * تنفيذ منطق قبل الإنشاء
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        // استخدام parent إذا كنت تريد تنفيذ أي منطق عام مضاف في BaseService مستقبلاً
        $data = parent::beforeCreate($data, $request);

        if (!isset($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }

        if (!isset($data['created_by']) && auth()->check()) {
            $data['created_by'] = auth()->id();
        }

        return $data;
    }

    /**
     * تنفيذ منطق بعد الإنشاء (داخل الترانزاكشن)
     */
    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // إضافة الباركود إذا وجد
        if (!empty($data['barcode'])) {
            Barcode::create([
                'company_id' => $item->company_id,
                'product_id' => $item->product_id,
                'variant_id' => $item->id,
                'barcode'    => $data['barcode'],
                'is_primary' => true,
                'type'       => 'variant',
                'created_by' => auth()->id(),
            ]);
        }
    }

    /**
     * تصحيح توقيع الدالة لتتطابق مع BaseService
     */
    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // استدعاء الأب مهم جداً لأنه يحتوي على فحص عدم تغيير الـ company_id
        parent::beforeUpdate($item, $data, $request);

        // أي منطق إضافي قبل التحديث يوضع هنا
        // ملاحظة: لا حاجة لعمل unset لـ product_id هنا لأن دالة prepareDataForUpdate
        // في الكلاس الأب تقوم بتنظيف البيانات تلقائياً بناءً على الأعمدة.
    }
}
