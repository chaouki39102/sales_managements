<?php

namespace App\Services;

use App\Models\Wilaya;

class WilayaService extends \App\Core\Services\BaseService
{
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
}
