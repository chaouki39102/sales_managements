<?php

namespace App\Services;

use App\Models\DocumentLineTemplate;
use App\Core\Services\BaseService;

class DocumentLineTemplateService extends BaseService
{
    protected string $model        = DocumentLineTemplate::class;
    protected string $resourceName = 'document_line_template';

    protected function getResourceName(): string
    {
        return 'document_line_template';
    }
}
