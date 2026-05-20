<?php

namespace App\Services;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BrandService extends \App\Core\Services\BaseService
{
    protected string $model        = Brand::class;
    protected string $resourceName = 'brand';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    protected function beforeCreate(array $data, $request): array
    {
        $data['company_id'] = $data['company_id'] ?? auth()->user()?->company_id;
        return $data;
    }

    // ─────────────────────────────────────────────────────────────
    // التحكم الصارم في البيانات المرسلة للاستعلام لمنع تزمت SQLite
    // ─────────────────────────────────────────────────────────────
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // 1. استدعاء الأب لتصفية company_id وحقن updated_by
        $data = parent::prepareDataForUpdate($item, $data, $request);

        // 2. إذا تم إرسال الاسم في طلب التحديث
        if (isset($data['name'])) {
            // نتحقق من الـ slug المتوقع عبر الدالة الساكنة المحدثة
            $proposedSlug = Brand::uniqueSlug($data['name'], $item->company_id, $item->id);

            if ($proposedSlug === $item->slug) {
                // منع التحديث المتكرر لنفس القيم الحالية لتفادي حرج القيود في SQLite
                unset($data['slug'], $data['name']);
            } else {
                // إذا كان هناك اسم جديد ينتج عنه slug مختلف فعلياً
                $data['slug'] = $proposedSlug;
            }
        } else {
            // في حال لم يرسل حقل الاسم، نتأكد من عدم العبث بالـ slug
            unset($data['slug']);
        }

        return $data;
    }
}
