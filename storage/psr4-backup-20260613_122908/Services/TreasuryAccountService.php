<?php

namespace App\Services;

use App\Models\TreasuryAccount;
use Illuminate\Http\Request;

class TreasuryAccountService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccount::class;
    protected string $resourceName = 'treasury_account';
    protected array $defaultWith = ['treasuryAccountType'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getBankAccounts() { return $this->model::bankAccounts()->get(); }
    public function getCashAccounts() { return $this->model::cashAccounts()->get(); }
    public function getDefault() { return $this->model::default()->first(); }
}
