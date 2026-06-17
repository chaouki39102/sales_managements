# Module Export: OpeningBalanceParty
Generated at: 2026-06-17 10:45:49

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\OpeningBalanceParty.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class OpeningBalanceParty extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'opening_balances_parties';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'party_id',
        'opening_balance',
        'balance_type',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable      = ['fiscal_year_id', 'party_id', 'balance_type'];
    public static array $sortable        = ['id', 'opening_balance', 'created_at'];
    public static array $defaultWith     = [];
    public static array $allowedIncludes = ['fiscalYear', 'party'];
    public static string $defaultSort    = 'party_id';
    public static ?int $cacheTtl         = 3600;
    public static array $cacheTags       = ['opening_balances_parties'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function isDebit(): bool
    {
        return $this->balance_type === 'debit';
    }

    public function isCredit(): bool
    {
        return $this->balance_type === 'credit';
    }

    /**
     * Signed amount: positive for debit, negative for credit.
     * Mirrors OpeningBalanceStock::getAverageCostPrice() pattern —
     * encapsulates the sign logic so callers never repeat it.
     */
    public function signedAmount(): float
    {
        return $this->isDebit()
            ? (float) $this->opening_balance
            : -(float) $this->opening_balance;
    }
}

```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\OpeningBalancePartyController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\OpeningBalancePartyResource;
use App\Services\OpeningBalancePartyService;
use App\Models\OpeningBalanceParty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalancePartyController extends BaseApiController
{
    protected string $resourceName = 'opening_balance_party';
    protected ?string $resourceClass = OpeningBalancePartyResource::class;

    public function __construct(private OpeningBalancePartyService $openingBalancePartyService)
    {
        parent::__construct();
    }

    protected function getService(): OpeningBalancePartyService
    {
        return $this->openingBalancePartyService;
    }

    protected function getModelClass(): string
    {
        return OpeningBalanceParty::class;
    }
}
```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\OpeningBalancePartyService.php
```php
<?php

namespace App\Services;

use App\Models\OpeningBalanceParty;
use Illuminate\Http\Request;

class OpeningBalancePartyService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceParty::class;
    protected string $resourceName = 'opening_balance_party';
    protected array $defaultWith = ['fiscalYear', 'party'];
    protected function getResourceName(): string { return $this->resourceName; }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\OpeningBalancePartyRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'party_id' => 'required|exists:parties,id',
            'opening_balance' => 'required|numeric',
            'balance_type' => 'required|in:debit,credit',
        ];
    }
}

class UpdateOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'party_id' => 'sometimes|exists:parties,id',
            'opening_balance' => 'sometimes|numeric',
            'balance_type' => 'sometimes|in:debit,credit',
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreOpeningBalancePartyRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'party_id' => 'required|exists:parties,id',
            'opening_balance' => 'required|numeric',
            'balance_type' => 'required|in:debit,credit',
        ];
    }
}


```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateOpeningBalancePartyRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'party_id' => 'sometimes|exists:parties,id',
            'opening_balance' => 'sometimes|numeric',
            'balance_type' => 'sometimes|in:debit,credit',
        ];
    }
}
```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\OpeningBalancePartyPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalancePartyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_opening_balance_party');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_opening_balance_party');
    }

    public function create(User $user): bool
    {
        return $user->can('create_opening_balance_party');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_opening_balance_party');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_opening_balance_party');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_opening_balance_party');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_opening_balance_party');
    }
}
```

