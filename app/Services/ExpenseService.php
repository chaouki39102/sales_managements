<?php

namespace App\Services;

use App\Models\Expense;

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
}
