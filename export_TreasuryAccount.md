# Module Export: TreasuryAccount
Generated at: 2026-06-16 11:19:54

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\TreasuryAccount.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;
use App\Services\TreasuryBalanceService;

#[Cacheable]
class TreasuryAccount extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes, Auditable;

    protected $table = 'treasury_accounts';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'treasury_account_type_id',
        'bank_name',
        'account_number',
        'rib',
        'iban',
        'swift_bic',
        'currency_id',
        'current_balance', // cache فقط — يُحدَّث عبر PaymentService
        'is_default',
        'active',
        'notes',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'current_balance' => 'decimal:4',
        'is_default'      => 'boolean',
        'active'          => 'boolean',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
        'deleted_at'      => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'bank_name', 'account_number', 'rib', 'iban'];
    public static array $filterable       = ['treasury_account_type_id', 'is_default', 'active', 'currency_id'];
    public static array $sortable         = ['id', 'name', 'code', 'current_balance'];
    public static array $defaultWith      = [];
    public static array $allowedIncludes  = [
        'treasuryAccountType', 'currency', 'payments',
        'paymentModes', 'expenses', 'openingBalances',
        'createdBy', 'updatedBy', 'deletedBy',
    ];
    public static string $defaultSort     = 'name';
    public static ?int $cacheTtl          = 300;
    public static array $cacheTags        = ['treasury_accounts'];

    public function treasuryAccountType(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccountType::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentModes(): HasMany
    {
        return $this->hasMany(PaymentMode::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceTreasury::class);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    public function scopeBankAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', fn($q) => $q->where('name', 'bank'));
    }

    public function scopeCashAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', fn($q) => $q->where('name', 'cash'));
    }

    public function isBankAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'bank';
    }

    public function isCashAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'cash';
    }

    /**
     * رصيد حقيقي محسوب من TreasuryBalanceService.
     * WARNING: 2 DB queries — لا تستخدمه داخل قوائم/collections.
     * استخدم getAllTreasuryBalancesAt() لشاشات القوائم.
     */
    public function getComputedBalanceAttribute(): float
    {
        return app(TreasuryBalanceService::class)
            ->getTreasuryBalanceAt($this->id, now()->toDateString())['current_balance'];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models\TreasuryAccountType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class TreasuryAccountType extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'treasury_account_types';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['treasuryAccounts'];
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['treasury_account_types', 'api'];

    public function treasuryAccounts(): HasMany
    {
        return $this->hasMany(TreasuryAccount::class);
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\TreasuryAccountController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountResource;
use App\Services\TreasuryAccountService;
use App\Models\TreasuryAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryAccountController extends BaseApiController
{
    protected string $resourceName = 'treasury_account';
    protected ?string $resourceClass = TreasuryAccountResource::class;

    public function __construct(private TreasuryAccountService $treasuryAccountService)
    {
        parent::__construct();
    }

    public function bankAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getBankAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات البنكية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'bankAccounts');
        }
    }

    public function cashAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getCashAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات النقدية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cashAccounts');
        }
    }

    public function default(Request $request): JsonResponse
    {
        try {
            $account = $this->treasuryAccountService->getDefault();
            return $this->successResponse($account ? new TreasuryAccountResource($account) : null, 'تم جلب الحساب الافتراضي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'default');
        }
    }

    protected function getService(): TreasuryAccountService
    {
        return $this->treasuryAccountService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccount::class;
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\TreasuryAccountTypeController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountTypeResource;
use App\Services\TreasuryAccountTypeService;
use App\Models\TreasuryAccountType;

class TreasuryAccountTypeController extends BaseApiController
{
    protected string $resourceName = 'treasury_account_type';
    protected ?string $resourceClass = TreasuryAccountTypeResource::class;

    public function __construct(private TreasuryAccountTypeService $treasuryAccountTypeService)
    {
        parent::__construct();
    }

    protected function getService(): TreasuryAccountTypeService
    {
        return $this->treasuryAccountTypeService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccountType::class;
    }
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\TreasuryAccountService.php
```php
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

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\TreasuryAccountTypeService.php
```php
<?php

namespace App\Services;

use App\Models\TreasuryAccountType;

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected function getResourceName(): string { return $this->resourceName; }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreTreasuryAccountRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code',
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}


```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\TreasuryAccountRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code',
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}

class UpdateTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code,' . $this->route('treasury_account'),
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateTreasuryAccountRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code,' . $this->route('treasury_account'),
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\TreasuryAccountPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TreasuryAccountPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_treasury_account');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_treasury_account');
    }

    public function create(User $user): bool
    {
        return $user->can('create_treasury_account');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_treasury_account');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_treasury_account');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_treasury_account');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_treasury_account');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\TreasuryAccountTypePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TreasuryAccountTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_treasury_account_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_treasury_account_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_treasury_account_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_treasury_account_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_treasury_account_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_treasury_account_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_treasury_account_type');
    }
}
```

