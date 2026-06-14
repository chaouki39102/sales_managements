<?php
// app/Models/Scopes/CompanyScope.php
namespace App\Models\Scopes;

use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // استخدام Service Container وليس session() مباشرة
        $context = app(CompanyContextService::class);

        if ($context->has()) {
            $builder->where(
                $model->getTable() . '.company_id',
                $context->get()
            );
        }
    }
}
