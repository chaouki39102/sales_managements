<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentBaseOperationResource;
use App\Services\DocumentBaseOperationService;
use App\Models\DocumentBaseOperation;

class DocumentBaseOperationController extends BaseApiController
{
    protected string $resourceName = 'document_base_operation';
    protected ?string $resourceClass = DocumentBaseOperationResource::class;

    public function __construct(private DocumentBaseOperationService $documentBaseOperationService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentBaseOperationService
    {
        return $this->documentBaseOperationService;
    }

    protected function getModelClass(): string
    {
        return DocumentBaseOperation::class;
    }
}
