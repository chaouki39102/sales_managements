<?php
// app/Services/CompanyService.php

namespace App\Services;

use App\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanyService extends \App\Core\Services\BaseService
{
    protected string $model = Company::class;
    protected string $resourceName = 'company';
    protected array $defaultWith = [];

    /**
     * قبل الإنشاء: تعيين slug و owner_id
     */
    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
        }
        $data['owner_id'] = auth()->id();
        $data['is_active'] = $data['is_active'] ?? true;
        return $data;
    }

    /**
     * بعد الإنشاء: ربط المستخدم بالشركة كـ default
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        // ربط المستخدم (owner) بالشركة كافتراضي
        $user = auth()->user();
        if ($user && !$user->companies->contains($item->id)) {
            $user->companies()->attach($item->id, ['is_default' => true]);
        }
    }

    /**
     * جلب شركات المستخدم الحالي (للاستخدام في Controller)
     */
    public function getUserCompanies()
    {
        return auth()->user()->companies()->get();
    }
}
