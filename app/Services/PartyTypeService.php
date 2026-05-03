<?php

namespace App\Services;

use App\Models\PartyType;

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = PartyType::class;
    protected string $resourceName = 'party_type';
    protected function getResourceName(): string { return $this->resourceName; }
}
