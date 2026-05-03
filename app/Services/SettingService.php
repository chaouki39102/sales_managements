<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingService extends \App\Core\Services\BaseService
{
    protected string $model = Setting::class;
    protected string $resourceName = 'setting';
    protected function getResourceName(): string { return $this->resourceName; }

    public function getByGroup(string $group)
    {
        return $this->model::byGroup($group)->get();
    }

    public function getValue(string $key, $default = null)
    {
        return $this->model::get($key, $default);
    }
}
