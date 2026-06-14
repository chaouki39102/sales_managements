<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentStatusResource;
use App\Services\DocumentStatusService;
use App\Models\DocumentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentStatusController extends BaseApiController
{
    protected string $resourceName = 'document_status';
    protected ?string $resourceClass = DocumentStatusResource::class;

    public function __construct(private DocumentStatusService $documentStatusService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentStatusService
    {
        return $this->documentStatusService;
    }

    protected function getModelClass(): string
    {
        return DocumentStatus::class;
    }
}