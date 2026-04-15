<?php

namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;

/**
 * Warehouse Service
 *
 * @package App\Services
 */
class WarehouseService extends \App\Core\Services\BaseService
{
    protected string $model = Warehouse::class;
    protected string $resourceName = 'warehouse';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['code'])) {
            $data['code'] = $this->generateWarehouseCode();
        }
        return $data;
    }

    private function generateWarehouseCode(): string
    {
        $prefix = 'WH';
        $last = $this->model::orderByDesc('code')->first();
        
        if (!$last) {
            return $prefix . '001';
        }

        $num = (int) substr($last->code, 2) + 1;
        return $prefix . str_pad($num, 3, '0', STR_PAD_LEFT);
    }
}
