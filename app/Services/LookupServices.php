<?php

namespace App\Services;

use App\Models\Wilaya;
use Illuminate\Http\Request;

class WilayaService extends \App\Core\Services\BaseService
{
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
}

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\Commune::class;
    protected string $resourceName = 'commune';
    protected array $defaultWith = ['wilaya'];
}

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
    protected array $defaultWith = ['stockMovements'];
}

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\ProductType::class;
    protected string $resourceName = 'product_type';
    protected array $defaultWith = ['products'];
}

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\PartyType::class;
    protected string $resourceName = 'party_type';
    protected array $defaultWith = ['parties'];
}