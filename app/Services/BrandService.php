<?php

namespace App\Services;

use App\Models\Brand;

/**
 * Brand Service
 *
 * @package App\Services
 */
class BrandService extends \App\Core\Services\BaseService
{
    protected string $model = Brand::class;
    protected string $resourceName = 'brand';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }
        return $data;
    }
}
