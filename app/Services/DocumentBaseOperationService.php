<?php

namespace App\Services;

use App\Models\DocumentBaseOperation;

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
}
