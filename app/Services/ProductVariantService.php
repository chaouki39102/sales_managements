<?php

namespace App\Services;

use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductVariantService extends \App\Core\Services\BaseService
{
    protected string $model = ProductVariant::class;
    protected string $resourceName = 'product_variant';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, Request $request): array
    {
        if (!isset($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }
        if (!isset($data['created_by'])) {
            $data['created_by'] = auth()->id();
        }
        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        // إذا تم إرسال باركود في الطلب، يمكن إنشاء سجل باركود مرتبط بهذا المتغير
        if (!empty($data['barcode'])) {
            $barcode = new \App\Models\Barcode([
                'company_id' => $item->company_id,
                'product_id' => $item->product_id,
                'variant_id' => $item->id,
                'barcode'    => $data['barcode'],
                'is_primary' => true,
                'type'       => 'variant',
                'created_by' => auth()->id(),
            ]);
            $barcode->save();
        }
    }

    protected function beforeUpdate(array $data, Model $item, Request $request): array
    {
        unset($data['product_id'], $data['company_id']);
        return $data;
    }
}
