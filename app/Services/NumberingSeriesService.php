<?php

namespace App\Services;

use App\Models\NumberingSeries;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NumberingSeriesService extends \App\Core\Services\BaseService
{
    protected string $model = NumberingSeries::class;
    protected string $resourceName = 'numbering_series';
    protected array $defaultWith = ['documentType', 'warehouse'];

    public function unlock(Model $item): Model
    {
        $item->update(['is_locked' => false]);
        return $item->fresh();
    }

    public function lock(Model $item): Model
    {
        $item->update(['is_locked' => true]);
        return $item->fresh();
    }
}