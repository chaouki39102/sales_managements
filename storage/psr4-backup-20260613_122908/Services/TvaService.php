<?php

namespace App\Services;

use App\Models\Tva;

class TvaService extends \App\Core\Services\BaseService
{
    protected string $model = Tva::class;
    protected string $resourceName = 'tva';
    protected function getResourceName(): string { return $this->resourceName; }
}
