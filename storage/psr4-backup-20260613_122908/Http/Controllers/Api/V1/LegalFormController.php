<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\LegalFormResource;
use App\Services\LegalFormService;

class LegalFormController extends BaseApiController
{
    protected string $resourceName = 'legal_form';
    protected ?string $resourceClass = LegalFormResource::class;

    public function __construct(private LegalFormService $legalFormService)
    {
        parent::__construct();
    }

    protected function getService(): LegalFormService
    {
        return $this->legalFormService;
    }

    protected function getModelClass(): string
    {
        return \App\Models\LegalForm::class;
    }
}