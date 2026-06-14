<?php

namespace App\Services;

use App\Models\Commune;

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = Commune::class;
    protected string $resourceName = 'commune';
    protected array $defaultWith = ['wilaya'];
    protected function getResourceName(): string { return $this->resourceName; }

}
