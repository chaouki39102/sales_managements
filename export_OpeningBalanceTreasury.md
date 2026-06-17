# Module Export: OpeningBalanceTreasury
Generated at: 2026-06-17 10:45:54

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\OpeningBalanceTreasury.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * OpeningBalanceTreasury
 * مرآة OpeningBalanceParty و OpeningBalanceStock للخزينة.
 */
#[Cacheable]
class OpeningBalanceTreasury extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'opening_balances_treasury';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'treasury_account_id',
        'opening_balance',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable       = ['fiscal_year_id', 'treasury_account_id'];
    public static array $sortable         = ['id', 'opening_balance', 'created_at'];
    public static array $defaultWith      = [];
    public static array $allowedIncludes  = ['fiscalYear', 'treasuryAccount'];
    public static string $defaultSort     = 'treasury_account_id';
    public static ?int $cacheTtl          = 3600;
    public static array $cacheTags        = ['opening_balances_treasury'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }
}

```

