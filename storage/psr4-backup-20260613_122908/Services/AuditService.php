<?php

namespace App\Services;

use App\Models\Audit;
use Illuminate\Http\Request;

class AuditService extends \App\Core\Services\BaseService
{
    protected string $model = Audit::class;
    protected string $resourceName = 'audit';
    protected array $defaultWith = ['user'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getByUser(int $userId)
    {
        return $this->model::forUser($userId)->get();
    }

    public function getByEvent(string $event)
    {
        return $this->model::forEvent($event)->get();
    }
}
