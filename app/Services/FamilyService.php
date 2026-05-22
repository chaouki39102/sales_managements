<?php

namespace App\Services;

use App\Models\Family;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Family Service
 *
 * @package App\Services
 */
class FamilyService extends \App\Core\Services\BaseService
{
    protected string $model = Family::class;
    protected string $resourceName = 'family';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, $request): array
    {
        // 💡 تم حذف سطر توليد الـ slug يدوياً هنا؛ لأن الموديل سيتولى توليده تلقائياً
        // داخل حدث الـ creating الخاص بالـ Eloquent بعد أن يقوم تريت HasCompany بحقن معرف الشركة بأمان.

        return $data;
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
            return parent::prepareDataForUpdate($item, $data, $request);

    }
}
