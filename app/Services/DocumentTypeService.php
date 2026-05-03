<?php

namespace App\Services;

use App\Models\DocumentType;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
    protected function getResourceName(): string { return $this->resourceName; }
}
