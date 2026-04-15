<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\WilayaResource;
use App\Services\WilayaService;
use App\Models\Wilaya;

class WilayaController extends BaseApiController
{
    protected string $resourceName = 'wilaya';
    protected ?string $resourceClass = WilayaResource::class;

    public function __construct(private WilayaService $wilayaService)
    {
        parent::__construct();
    }

    protected function getService(): WilayaService
    {
        return $this->wilayaService;
    }

    protected function getModelClass(): string
    {
        return Wilaya::class;
    }
}