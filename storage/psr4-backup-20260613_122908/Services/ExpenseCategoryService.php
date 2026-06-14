<?php

namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryService extends \App\Core\Services\BaseService
{
    protected string $model = ExpenseCategory::class;
    protected string $resourceName = 'expense_category';
    protected array $defaultWith = ['parent', 'children'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getRoots()
    {
        return $this->model::roots()->get();
    }
}
