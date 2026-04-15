<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommuneResource;
use App\Services\CommuneService;
use App\Models\Commune;

class CommuneController extends BaseApiController
{
    protected string $resourceName = 'commune';
    protected ?string $resourceClass = CommuneResource::class;

    public function __construct(private CommuneService $communeService)
    {
        parent::__construct();
    }

    protected function getService(): CommuneService
    {
        return $this->communeService;
    }

    protected function getModelClass(): string
    {
        return Commune::class;
    }
}