<?php

namespace App\Services;

use App\Models\DocumentStatus;
use Illuminate\Http\Request;

class DocumentStatusService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentStatus::class;
    protected string $resourceName = 'document_status';
    protected function getResourceName(): string { return $this->resourceName; }
}
