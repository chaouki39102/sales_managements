<?php

namespace App\Services;

use App\Models\Family;

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
        if (empty($data['code'])) {
            $data['code'] = $this->generateFamilyCode();
        }
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }
        return $data;
    }

    private function generateFamilyCode(): string
    {
        $prefix = 'FAM';
        $last = $this->model::orderByDesc('code')->first();

        if (!$last) {
            return $prefix . '001';
        }

        $num = (int) substr($last->code, 3) + 1;
        return $prefix . str_pad($num, 3, '0', STR_PAD_LEFT);
    }
}
