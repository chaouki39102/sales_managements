# Module Export: Party
Generated at: 2026-05-22 15:56:39

## Models

### 📁 C:\xampp\htdocs\sales_managements\app\Models\OpeningBalanceParty.php
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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'party_id', 'balance_type'];
    public static array $sortable = ['id', 'opening_balance', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'party'];
    public static string $defaultSort = 'party_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_parties'];

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
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\Party.php
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
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;


#[Cacheable]
class Party extends Model
{
    use HasStandardizedConfiguration, SoftDeletes,
        HasCompany, Auditable, HasTenantSlug, HasTenantRouteBinding;

    protected $table = 'parties';

    protected $fillable = [
        'company_id',
        'party_type_id',
        'code',
        'name',
        'commercial_name',
        'slug',
        'activity',
        'rc',
        'nif',
        'nis',
        'ai',
        'legal_form_id',
        'capital_amount',
        'rc_date',
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'mobile',
        'fax',
        'email',
        'avatar',
        'bank_name',
        'rib',
        'initial_balance',
        'credit_limit',
        'default_price_level_id',
        'credit_days',
        'is_tva_exempt',
        'is_taxable',
        'tax_option',
        'cnas_number',
        'tax_regime',
        'is_final_consumer',
        'is_vat_registered',
        'vat_registration_date',
        'additional_data',
        'active',
    ];

    protected $casts = [
        'capital_amount' => 'decimal:4',
        'rc_date' => 'date',
        'initial_balance' => 'decimal:4',
        'credit_limit' => 'decimal:4',
        'credit_days' => 'integer',
        'is_tva_exempt' => 'boolean',
        'is_taxable' => 'boolean',
        'is_final_consumer' => 'boolean',
        'is_vat_registered' => 'boolean',
        'vat_registration_date' => 'date',
        'additional_data' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'commercial_name', 'code', 'nif', 'rc', 'email', 'phone', 'mobile', 'address'];
    public static array $filterable = [
        'party_type_id', 'legal_form_id', 'commune_id', 'wilaya_id', 'default_price_level_id',
        'is_tva_exempt', 'is_taxable', 'is_final_consumer', 'is_vat_registered', 'active'
    ];
    public static array $sortable = ['id', 'code', 'name', 'commercial_name', 'created_at', 'updated_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'partyType', 'legalForm', 'commune', 'wilaya', 'defaultPriceLevel',
        'commercialDocuments', 'payments', 'openingBalances', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['parties'];
    public static array $cacheInvalidateRelations = ['commercialDocuments', 'payments'];
    public static array $scopes = [];

    public function partyType(): BelongsTo { return $this->belongsTo(PartyType::class); }
    public function legalForm(): BelongsTo { return $this->belongsTo(LegalForm::class); }
    public function commune(): BelongsTo { return $this->belongsTo(Commune::class); }
    public function wilaya(): BelongsTo { return $this->belongsTo(Wilaya::class); }
    public function defaultPriceLevel(): BelongsTo { return $this->belongsTo(PriceLevel::class, 'default_price_level_id'); }
    public function commercialDocuments(): HasMany { return $this->hasMany(CommercialDocument::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function openingBalances(): HasMany { return $this->hasMany(OpeningBalanceParty::class); }
    public function checks(): HasMany { return $this->hasMany(Check::class); }

    public function scopeCustomers(Builder $query): Builder
    {
        return $query->whereHas('partyType', fn($q) => $q->whereIn('name', ['client', 'both']));
    }

    public function scopeSuppliers(Builder $query): Builder
    {
        return $query->whereHas('partyType', fn($q) => $q->whereIn('name', ['supplier', 'both']));
    }

    public function scopeVatRegistered(Builder $query): Builder
    {
        return $query->where('is_vat_registered', true);
    }

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([$this->address, $this->commune?->name, $this->wilaya?->name]);
        return implode(', ', $parts);
    }

    public function getCurrentBalanceAttribute(): float
    {
        return 0.00; // سيتم تنفيذه لاحقاً
    }

    public function isCustomer(): bool
    {
        return in_array($this->partyType?->name, ['client', 'both']);
    }

    public function isSupplier(): bool
    {
        return in_array($this->partyType?->name, ['supplier', 'both']);
    }

}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\PartyType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class PartyType extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'party_types';

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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['party_types', 'lookups'];

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }
}
```

## Controllers

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\OpeningBalancePartyController.php
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

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\PartyController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StorePartyRequest;
use App\Http\Requests\UpdatePartyRequest;
use App\Http\Resources\PartyResource;
use App\Services\PartyService;
use App\Models\Party;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Party Controller
 *
 * إدارة الأطراف (العملاء والموردين) مع:
 * - CRUD كامل
 * - تصفية حسب النوع (زبون/مورد)
 * - البحث والترتيب
 * - التحقق من الصلاحيات
 *
 * @package App\Http\Controllers\Api\V1
 */
class PartyController extends BaseApiController
{
    protected string $resourceName = 'party';
    protected ?string $resourceClass = PartyResource::class;

    public function __construct(private PartyService $partyService)
    {
        parent::__construct();
    }

    /**
     * Get customers only
     */
    public function customers(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Party::class);

            $result = $this->partyService->getCustomers($request->all());

            return $this->successResponse(
                PartyResource::collection($result),  // ✅ يدعم paginator تلقائياً
                'تم جلب قائمة العملاء بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'customers');
        }
    }

    public function suppliers(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Party::class);

            $result = $this->partyService->getSuppliers($request->all());

            return $this->successResponse(
                PartyResource::collection($result),
                'تم جلب قائمة الموردين بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suppliers');
        }
    }

    // === Abstract Methods Implementation ===

    protected function getService(): PartyService
    {
        return $this->partyService;
    }

    protected function getModelClass(): string
    {
        return Party::class;
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\PartyTypeController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PartyTypeResource;
use App\Services\PartyTypeService;
use App\Models\PartyType;

class PartyTypeController extends BaseApiController
{
    protected string $resourceName = 'party_type';
    protected ?string $resourceClass = PartyTypeResource::class;

    public function __construct(private PartyTypeService $partyTypeService)
    {
        parent::__construct();
    }

    protected function getService(): PartyTypeService
    {
        return $this->partyTypeService;
    }

    protected function getModelClass(): string
    {
        return PartyType::class;
    }
}
```

## Services

### 📁 C:\xampp\htdocs\sales_managements\app\Services\OpeningBalancePartyService.php
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

### 📁 C:\xampp\htdocs\sales_managements\app\Services\PartyService.php
```php
<?php

namespace App\Services;

use App\Models\Party;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Party Service
 *
 * إدارة الأطراف (العملاء والموردين) مع المتطلبات الجزائرية:
 * - RC, NIF, NIS, AI
 * - التحقق من صحة البيانات
 * - إدارة الأرصدة والحدود الائتمانية
 *
 * @package App\Services
 */
class PartyService extends \App\Core\Services\BaseService
{
    protected string $model = Party::class;
    protected string $resourceName = 'party';
    protected array $defaultWith = ['partyType', 'legalForm', 'commune', 'wilaya'];
    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * Before creating - data preparation and validation
     */
    protected function beforeCreate(array $data, $request): array
{
    $data = parent::beforeCreate($data, $request); // ← أضف

    if (empty($data['code'])) {
        $data['code'] = $this->generatePartyCode(
            $data['party_type_id'],
            app(\App\Services\CompanyContextService::class)->get()
        );
    }

    // ← احذف generateSlug — HasTenantSlug يتولاه
    $this->validateAlgerianFields($data);
    return $data;
}

private function generatePartyCode(int $partyTypeId, ?int $companyId): string
{
    $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP';

    do {
        $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
    } while (
        Party::where('code', $code)
             ->where('company_id', $companyId) // ← أضف
             ->exists()
    );

    return $code;
}


    /**
     * After create - within transaction
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        // Any post-creation logic within transaction
        // e.g., create opening balance if needed
    }

    /**
     * After database commit - external operations
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send welcome notification if needed
        // Mail::send(new PartyCreatedNotification($item));
    }

    /**
     * Before update - business rules validation
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // Check if party is active before critical changes
        if ($item->active && isset($data['active']) && !$data['active']) {
            // Check if party has active commercial documents
            if ($item->commercialDocuments()->where('status', 'confirmed')->exists()) {
                throw new BusinessRuleException('لا يمكن إلغاء تفعيل متعامل لديه وثائق تجارية نشطة', 409);
            }
        }

        // Validate Algerian fields if changed
        $this->validateAlgerianFields($data, $item);
    }

    /**
     * After update committed
     */
    protected function afterUpdateCommitted(Model $item, array $data, $request): void
    {
        // Clear related caches if critical data changed
        if (isset($data['active']) || isset($data['credit_limit'])) {
            // Additional cache clearing if needed
        }
    }

    /**
     * Before delete - business rules
     */
    protected function beforeDelete(Model $item): void
    {
        // Check if party can be deleted
        if ($item->commercialDocuments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه وثائق تجارية', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه دفعات', 409);
        }
    }


    /**
     * Validate Algerian-specific fields
     */
    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
{
    $companyId = app(\App\Services\CompanyContextService::class)->get();

    if (isset($data['nif']) && !empty($data['nif'])) {
        if (!preg_match('/^\d{15,20}$/', $data['nif'])) {
            throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-20 رقم', 422);
        }

        $query = Party::where('nif', $data['nif'])
                      ->where('company_id', $companyId); // ← أضف
        if ($existingParty) {
            $query->where('id', '!=', $existingParty->id);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
        }
    }

    if (isset($data['rc']) && !empty($data['rc'])) {
        if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
            throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
        }
    }

    if (isset($data['nis']) && !empty($data['nis'])) {
        if (!preg_match('/^\d{15,18}$/', $data['nis'])) {
            throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 15-18 رقم', 422);
        }
    }

    if (isset($data['email']) && !empty($data['email'])) {
        $query = Party::where('email', $data['email'])
                      ->where('company_id', $companyId); // ← أضف
        if ($existingParty) {
            $query->where('id', '!=', $existingParty->id);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
        }
    }

    if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
        throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
    }
}

    /**
     * Get customers only
     */
    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }

    public function getCustomers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ فلترة بـ party_type_id مباشرة — لا نعتمد على party_types table
            // party_type_id = 1 → زبون (كما يُرسله الـ Frontend)
            ->where('party_type_id', 1)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            // active يمكن أن يكون null أو true — نقبل كليهما
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }

    public function getSuppliers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ party_type_id = 2 → مورد
            ->where('party_type_id', 2)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\PartyTypeService.php
```php
<?php

namespace App\Services;

use App\Models\PartyType;

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = PartyType::class;
    protected string $resourceName = 'party_type';
    protected function getResourceName(): string { return $this->resourceName; }
}

```

## Requests

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\OpeningBalancePartyRequest.php
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

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StorePartyRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Store Party Request
 *
 * التحقق من صحة بيانات إنشاء متعامل جديد
 */
class StorePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Party type (required)
            'party_type_id' => 'required|exists:party_types,id',

            // Basic information
            'code' => 'nullable|string|max:50|unique:parties,code',
            'name' => 'required|string|max:150',
            'commercial_name' => 'nullable|string|max:150',

            // Algerian legal information
            'activity' => 'nullable|string|max:500',
            'rc' => 'nullable|string|max:50',
            'nif' => 'nullable|string|regex:/^\d{15,16}$/|unique:parties,nif',
            'nis' => 'nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'nullable|string|max:50',
            'legal_form_id' => 'nullable|exists:legal_forms,id',
            'capital_amount' => 'nullable|numeric|min:0',
            'rc_date' => 'nullable|date|before:today',

            // Contact information
            'address' => 'nullable|string|max:500',
            'commune_id' => 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:30',
            'fax' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100|unique:parties,email',

            // Banking information
            'bank_name' => 'nullable|string|max:100',
            'rib' => 'nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'nullable|numeric',
            'credit_limit' => 'nullable|numeric|min:0',
            'default_price_level_id' => 'nullable|exists:price_levels,id',
            'credit_days' => 'nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'nullable|boolean',
            'is_taxable' => 'nullable|boolean',
            'tax_option' => 'nullable|string|max:50',
            'cnas_number' => 'nullable|string|max:50',
            'tax_regime' => 'nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'nullable|boolean',
            'is_vat_registered' => 'nullable|boolean',
            'vat_registration_date' => 'nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'nullable|array',
            'active' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.required' => 'نوع المتعامل مطلوب',
            'party_type_id.exists' => 'نوع المتعامل غير صحيح',
            'code.unique' => 'الرمز موجود بالفعل',
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم يجب أن لا يتجاوز 150 حرف',
            'commercial_name.max' => 'الاسم التجاري يجب أن لا يتجاوز 150 حرف',
            'rc.max' => 'رقم السجل التجاري يجب أن لا يتجاوز 50 حرف',
            'nif.regex' => 'رقم التعريف الجبائي يجب أن يكون 15-16 رقم',
            'nif.unique' => 'رقم التعريف الجبائي موجود بالفعل',
            'nis.regex' => 'رقم التعريف الإحصائي يجب أن يكون 10-15 رقم',
            'ai.max' => 'المادة الجبائية يجب أن لا تتجاوز 50 حرف',
            'legal_form_id.exists' => 'الشكل القانوني غير صحيح',
            'capital_amount.numeric' => 'رأس المال يجب أن يكون رقماً',
            'capital_amount.min' => 'رأس المال يجب أن يكون موجباً',
            'rc_date.date' => 'تاريخ السجل التجاري غير صحيح',
            'rc_date.before' => 'تاريخ السجل التجاري يجب أن يكون في الماضي',
            'address.max' => 'العنوان يجب أن لا يتجاوز 500 حرف',
            'commune_id.exists' => 'البلدية غير صحيحة',
            'wilaya_id.exists' => 'الولاية غير صحيحة',
            'phone.max' => 'الهاتف يجب أن لا يتجاوز 20 حرف',
            'mobile.max' => 'الجوال يجب أن لا يتجاوز 30 حرف',
            'fax.max' => 'الفاكس يجب أن لا يتجاوز 30 حرف',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.unique' => 'البريد الإلكتروني موجود بالفعل',
            'bank_name.max' => 'اسم البنك يجب أن لا يتجاوز 100 حرف',
            'rib.max' => 'RIB يجب أن لا يتجاوز 30 حرف',
            'initial_balance.numeric' => 'الرصيد الابتدائي يجب أن يكون رقماً',
            'credit_limit.numeric' => 'الحد الائتماني يجب أن يكون رقماً',
            'credit_limit.min' => 'الحد الائتماني يجب أن يكون موجباً',
            'default_price_level_id.exists' => 'مستوى السعر الافتراضي غير صحيح',
            'credit_days.integer' => 'أيام الائتمان يجب أن تكون رقماً صحيحاً',
            'credit_days.min' => 'أيام الائتمان يجب أن تكون موجبة',
            'credit_days.max' => 'أيام الائتمان يجب أن لا تتجاوز 365 يوم',
            'is_tva_exempt.boolean' => 'معفى من TVA يجب أن يكون صحيح أو خطأ',
            'is_taxable.boolean' => 'خاضع للضريبة يجب أن يكون صحيح أو خطأ',
            'tax_option.max' => 'خيار الضريبة يجب أن لا يتجاوز 50 حرف',
            'cnas_number.max' => 'رقم CNAS يجب أن لا يتجاوز 50 حرف',
            'tax_regime.in' => 'نظام الضريبة يجب أن يكون forfaitaire أو réel',
            'is_final_consumer.boolean' => 'مستهلك نهائي يجب أن يكون صحيح أو خطأ',
            'is_vat_registered.boolean' => 'مسجل في TVA يجب أن يكون صحيح أو خطأ',
            'vat_registration_date.date' => 'تاريخ التسجيل في TVA غير صحيح',
            'vat_registration_date.before_or_equal' => 'تاريخ التسجيل في TVA يجب أن يكون اليوم أو في الماضي',
            'additional_data.array' => 'البيانات الإضافية يجب أن تكون مصفوفة',
            'active.boolean' => 'التفعيل يجب أن يكون صحيح أو خطأ',
        ];
    }

    public function prepareForValidation()
    {
        // Set default values
        if (!$this->has('active')) {
            $this->merge(['active' => true]);
        }
        if (!$this->has('is_taxable')) {
            $this->merge(['is_taxable' => true]);
        }
        if (!$this->has('initial_balance')) {
            $this->merge(['initial_balance' => 0.00]);
        }
        if (!$this->has('credit_limit')) {
            $this->merge(['credit_limit' => 0.00]);
        }
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdatePartyRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Party Request
 *
 * التحقق من صحة بيانات تحديث متعامل موجود
 */
class UpdatePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $partyId = $this->route('party')?->id ?? $this->route('id');

        return [
            // Party type
            'party_type_id' => 'sometimes|exists:party_types,id',

            // Basic information
            'code' => "sometimes|nullable|string|max:50|unique:parties,code,{$partyId}",
            'name' => 'sometimes|required|string|max:150',
            'commercial_name' => 'sometimes|nullable|string|max:150',

            // Algerian legal information
            'activity' => 'sometimes|nullable|string|max:500',
            'rc' => 'sometimes|nullable|string|max:50',
            'nif' => "sometimes|nullable|string|regex:/^\d{15,16}$/|unique:parties,nif,{$partyId}",
            'nis' => 'sometimes|nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'sometimes|nullable|string|max:50',
            'legal_form_id' => 'sometimes|nullable|exists:legal_forms,id',
            'capital_amount' => 'sometimes|nullable|numeric|min:0',
            'rc_date' => 'sometimes|nullable|date|before:today',

            // Contact information
            'address' => 'sometimes|nullable|string|max:500',
            'commune_id' => 'sometimes|nullable|exists:communes,id',
            'wilaya_id' => 'sometimes|nullable|exists:wilayas,id',
            'phone' => 'sometimes|nullable|string|max:20',
            'mobile' => 'sometimes|nullable|string|max:30',
            'fax' => 'sometimes|nullable|string|max:30',
            'email' => "sometimes|nullable|email|max:100|unique:parties,email,{$partyId}",

            // Banking information
            'bank_name' => 'sometimes|nullable|string|max:100',
            'rib' => 'sometimes|nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'sometimes|nullable|numeric',
            'credit_limit' => 'sometimes|nullable|numeric|min:0',
            'default_price_level_id' => 'sometimes|nullable|exists:price_levels,id',
            'credit_days' => 'sometimes|nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'sometimes|nullable|boolean',
            'is_taxable' => 'sometimes|nullable|boolean',
            'tax_option' => 'sometimes|nullable|string|max:50',
            'cnas_number' => 'sometimes|nullable|string|max:50',
            'tax_regime' => 'sometimes|nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'sometimes|nullable|boolean',
            'is_vat_registered' => 'sometimes|nullable|boolean',
            'vat_registration_date' => 'sometimes|nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'sometimes|nullable|array',
            'active' => 'sometimes|nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.exists' => 'نوع المتعامل غير صحيح',
            'code.unique' => 'الرمز موجود بالفعل',
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم يجب أن لا يتجاوز 150 حرف',
            'commercial_name.max' => 'الاسم التجاري يجب أن لا يتجاوز 150 حرف',
            'rc.max' => 'رقم السجل التجاري يجب أن لا يتجاوز 50 حرف',
            'nif.regex' => 'رقم التعريف الجبائي يجب أن يكون 15-16 رقم',
            'nif.unique' => 'رقم التعريف الجبائي موجود بالفعل',
            'nis.regex' => 'رقم التعريف الإحصائي يجب أن يكون 10-15 رقم',
            'ai.max' => 'المادة الجبائية يجب أن لا تتجاوز 50 حرف',
            'legal_form_id.exists' => 'الشكل القانوني غير صحيح',
            'capital_amount.numeric' => 'رأس المال يجب أن يكون رقماً',
            'capital_amount.min' => 'رأس المال يجب أن يكون موجباً',
            'rc_date.date' => 'تاريخ السجل التجاري غير صحيح',
            'rc_date.before' => 'تاريخ السجل التجاري يجب أن يكون في الماضي',
            'address.max' => 'العنوان يجب أن لا يتجاوز 500 حرف',
            'commune_id.exists' => 'البلدية غير صحيحة',
            'wilaya_id.exists' => 'الولاية غير صحيحة',
            'phone.max' => 'الهاتف يجب أن لا يتجاوز 20 حرف',
            'mobile.max' => 'الجوال يجب أن لا يتجاوز 30 حرف',
            'fax.max' => 'الفاكس يجب أن لا يتجاوز 30 حرف',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.unique' => 'البريد الإلكتروني موجود بالفعل',
            'bank_name.max' => 'اسم البنك يجب أن لا يتجاوز 100 حرف',
            'rib.max' => 'RIB يجب أن لا يتجاوز 30 حرف',
            'initial_balance.numeric' => 'الرصيد الابتدائي يجب أن يكون رقماً',
            'credit_limit.numeric' => 'الحد الائتماني يجب أن يكون رقماً',
            'credit_limit.min' => 'الحد الائتماني يجب أن يكون موجباً',
            'default_price_level_id.exists' => 'مستوى السعر الافتراضي غير صحيح',
            'credit_days.integer' => 'أيام الائتمان يجب أن تكون رقماً صحيحاً',
            'credit_days.min' => 'أيام الائتمان يجب أن تكون موجبة',
            'credit_days.max' => 'أيام الائتمان يجب أن لا تتجاوز 365 يوم',
            'is_tva_exempt.boolean' => 'معفى من TVA يجب أن يكون صحيح أو خطأ',
            'is_taxable.boolean' => 'خاضع للضريبة يجب أن يكون صحيح أو خطأ',
            'tax_option.max' => 'خيار الضريبة يجب أن لا يتجاوز 50 حرف',
            'cnas_number.max' => 'رقم CNAS يجب أن لا يتجاوز 50 حرف',
            'tax_regime.in' => 'نظام الضريبة يجب أن يكون forfaitaire أو réel',
            'is_final_consumer.boolean' => 'مستهلك نهائي يجب أن يكون صحيح أو خطأ',
            'is_vat_registered.boolean' => 'مسجل في TVA يجب أن يكون صحيح أو خطأ',
            'vat_registration_date.date' => 'تاريخ التسجيل في TVA غير صحيح',
            'vat_registration_date.before_or_equal' => 'تاريخ التسجيل في TVA يجب أن يكون اليوم أو في الماضي',
            'additional_data.array' => 'البيانات الإضافية يجب أن تكون مصفوفة',
            'active.boolean' => 'التفعيل يجب أن يكون صحيح أو خطأ',
        ];
    }
}
```

## Policies

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\OpeningBalancePartyPolicy.php
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

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\PartyPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_party');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_party');
    }

    public function create(User $user): bool
    {
        return $user->can('create_party');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_party');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_party');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_party');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_party');
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\PartyTypePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartyTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_party_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_party_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_party_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_party_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_party_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_party_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_party_type');
    }
}
```

