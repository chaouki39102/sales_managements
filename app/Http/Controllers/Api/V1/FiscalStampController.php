<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalStampResource;
use App\Services\FiscalStampService;
use App\Models\FiscalStamp;

class FiscalStampController extends BaseApiController
{
    protected string $resourceName = 'fiscal_stamp';
    protected ?string $resourceClass = FiscalStampResource::class;

    public function __construct(private FiscalStampService $fiscalStampService)
    {
        parent::__construct();
    }

    protected function getService(): FiscalStampService
    {
        return $this->fiscalStampService;
    }

    protected function getModelClass(): string
    {
        return FiscalStamp::class;
    }
}
