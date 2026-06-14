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
        return parent::beforeCreate($data, $request);
    }

    // ─────────────────────────────────────────────────────────────
    // التحكم الصارم في البيانات المرسلة للاستعلام لمنع تزمت SQLite
    // ─────────────────────────────────────────────────────────────
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        return parent::prepareDataForUpdate($item, $data, $request);
    }
}
