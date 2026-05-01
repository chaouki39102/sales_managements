<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Barcode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BarcodeService extends \App\Core\Services\BaseService
{
    protected string $model = Barcode::class;
    protected string $resourceName = 'barcode';

    protected function beforeCreate(array $data, Request $request): array
    {
        $data['company_id'] = $this->getCurrentCompanyId();
        $data['created_by'] = auth()->id();
        return $data;
    }

    protected function beforeUpdate(array $data, Model $item, Request $request): array
    {
        // منع تغيير product_id بعد الإنشاء
        unset($data['product_id']);
        return $data;
    }

    private function getCurrentCompanyId(): int
    {
        // استخدم CompanyContextService كما في مشروعك
        return app(\App\Services\CompanyContextService::class)->getCurrentCompanyId();
    }
}
