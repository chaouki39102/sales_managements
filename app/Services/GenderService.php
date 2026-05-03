<?php

namespace App\Services;

use App\Models\Gender;

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
    protected function getResourceName(): string { return $this->resourceName; }
}
