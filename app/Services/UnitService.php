<?php

namespace App\Services;

use App\Models\Unit;

class UnitService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string { return $this->resourceName; }
    protected string $model = Unit::class;
    protected string $resourceName = 'unit';
}
