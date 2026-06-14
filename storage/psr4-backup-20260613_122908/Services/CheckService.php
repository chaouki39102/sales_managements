<?php

namespace App\Services;

use App\Models\Check;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CheckService extends \App\Core\Services\BaseService
{
    protected string $model = Check::class;
    protected string $resourceName = 'check';
    protected array $defaultWith = ['party', 'payments'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getPending()
    {
        return $this->model::pending()->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->get();
    }

    public function markAsCleared(Model $item): Model
    {
        $item->markAsCleared();
        return $item->fresh();
    }

    public function markAsBounced(Model $item, string $reason): Model
    {
        $item->markAsBounced($reason);
        return $item->fresh();
    }
}
