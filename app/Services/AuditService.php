<?php

namespace App\Services;

use App\Models\Audit;
use Illuminate\Http\Request;

class AuditService extends \App\Core\Services\BaseService
{
    protected string $model = Audit::class;
    protected string $resourceName = 'audit';
    protected array $defaultWith = ['user', 'auditable'];
    protected array $showWith = ['user', 'auditable'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getByUser(int $userId)
    {
        return $this->model::forUser($userId)->with($this->defaultWith)->get();
    }

    public function getByEvent(string $event)
    {
        return $this->model::forEvent($event)->with($this->defaultWith)->get();
    }
}
