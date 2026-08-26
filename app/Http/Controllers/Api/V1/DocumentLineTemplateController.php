<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\DocumentLineTemplate;
use App\Services\DocumentLineTemplateService;

class DocumentLineTemplateController extends BaseApiController
{
    protected string $resourceName = 'document_line_template';

    public function __construct(private DocumentLineTemplateService $service)
    {
        parent::__construct();
    }

    protected function getService(): DocumentLineTemplateService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return DocumentLineTemplate::class;
    }
}
