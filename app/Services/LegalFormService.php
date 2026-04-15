<?php

namespace App\Services;

use App\Models\LegalForm;

class LegalFormService extends \App\Core\Services\BaseService
{
    protected string $model = LegalForm::class;
    protected string $resourceName = 'legal_form';
}
