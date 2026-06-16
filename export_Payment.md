# Module Export: Payment
Generated at: 2026-06-16 11:20:14

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\DocumentPayment.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class DocumentPayment extends Pivot
{
    protected $table = 'document_payment';

    protected $fillable = [
        'company_id',
        'commercial_document_id',
        'payment_id',
        'amount_applied',
        'notes',
    ];

    protected $casts = [
        'amount_applied' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Models\Payment.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;

#[Cacheable]
class Payment extends Model
{
    use HasStandardizedConfiguration, SoftDeletes,
        HasCompany, Auditable, BelongsToFiscalYear, HasTenantRouteBinding;

    protected $table = 'payments';

    protected $fillable = [
        'company_id',
        'payment_number',
        'payment_date',
        'amount',
        'currency_id',
        'amount_local',
        'payment_mode_id',
        'treasury_account_id',
        'check_id',
        'party_id',
        'fiscal_year_id',
        'reference',
        'bank_reference',
        'notes',
        'status',
        'is_reconciled',
        'reconciliation_date',
        'clearing_date',
        'user_id',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:4',
        'amount_local' => 'decimal:4',
        'is_reconciled' => 'boolean',
        'reconciliation_date' => 'date',
        'clearing_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['payment_number', 'reference', 'bank_reference', 'notes'];
    public static array $filterable = [
        'payment_mode_id', 'treasury_account_id', 'check_id', 'party_id',
        'fiscal_year_id', 'currency_id', 'user_id', 'status', 'is_reconciled'
    ];
    public static array $sortable = ['id', 'payment_number', 'payment_date', 'amount', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'currency', 'paymentMode', 'treasuryAccount', 'check', 'party',
        'fiscalYear', 'user', 'commercialDocuments', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'payment_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['payments'];
    public static array $cacheInvalidateRelations = ['commercialDocuments'];
    public static array $scopes = [];

    public function currency(): BelongsTo { return $this->belongsTo(Currency::class); }
    public function paymentMode(): BelongsTo { return $this->belongsTo(PaymentMode::class); }
    public function treasuryAccount(): BelongsTo { return $this->belongsTo(TreasuryAccount::class); }
    public function check(): BelongsTo { return $this->belongsTo(Check::class); }
    public function party(): BelongsTo { return $this->belongsTo(Party::class); }
    public function fiscalYear(): BelongsTo { return $this->belongsTo(FiscalYear::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function commercialDocuments(): BelongsToMany
    {
        return $this->belongsToMany(CommercialDocument::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }

    public function scopeConfirmed(Builder $query): Builder { return $query->where('status', 'confirmed'); }
    public function scopePending(Builder $query): Builder { return $query->where('status', 'pending'); }
    public function scopeReconciled(Builder $query): Builder { return $query->where('is_reconciled', true); }
    public function scopeUnreconciled(Builder $query): Builder { return $query->where('is_reconciled', false); }

    public function getTotalApplied(): float
    {
        return $this->commercialDocuments()->sum('document_payment.amount_applied');
    }

    public function getUnappliedAmount(): float
    {
        return $this->amount - $this->getTotalApplied();
    }

    public function isFullyApplied(): bool
    {
        return $this->getUnappliedAmount() <= 0.01;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Models\PaymentMode.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class PaymentMode extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'payment_modes';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'description',
        'treasury_account_id',
        'requires_reference',
        'is_cash',
        'active',
        'display_order',
    ];

    protected $casts = [
        'requires_reference' => 'boolean',
        'is_cash' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['treasury_account_id', 'is_cash', 'requires_reference', 'active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['treasuryAccount', 'payments', 'expenses'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['payment_modes', 'lookups'];

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    
}

```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\PaymentController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentResource;
use App\Services\PaymentService;
use App\Models\Payment;

class PaymentController extends BaseApiController
{
    protected string $resourceName = 'payment';
    protected ?string $resourceClass = PaymentResource::class;

    public function __construct(private PaymentService $paymentService)
    {
        parent::__construct();
    }

    protected function getService(): PaymentService
    {
        return $this->paymentService;
    }

    protected function getModelClass(): string
    {
        return Payment::class;
    }

    public function confirmed()
    {
        return $this->getService()->getConfirmed();
    }

    public function pending()
    {
        return $this->getService()->getPending();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\PaymentModeController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentModeResource;
use App\Services\PaymentModeService;
use App\Models\PaymentMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentModeController extends BaseApiController
{
    protected string $resourceName = 'payment_mode';
    protected ?string $resourceClass = PaymentModeResource::class;

    public function __construct(private PaymentModeService $paymentModeService)
    {
        parent::__construct();
    }

    public function active(Request $request): JsonResponse
    {
        try {
            $modes = $this->paymentModeService->getActive();
            return $this->successResponse(
                PaymentModeResource::collection($modes),
                'تم جلب أوضاع الدفع النشطة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): PaymentModeService
    {
        return $this->paymentModeService;
    }

    protected function getModelClass(): string
    {
        return PaymentMode::class;
    }
}
```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\PaymentModeService.php
```php
<?php

namespace App\Services;

use App\Models\PaymentMode;
use Illuminate\Http\Request;

class PaymentModeService extends \App\Core\Services\BaseService
{
    protected string $model = PaymentMode::class;
    protected string $resourceName = 'payment_mode';
    protected array $defaultWith = ['treasuryAccount'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getActive()
    {
        return $this->model::where('active', true)->get();
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\PaymentService.php
```php
<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;

/**
 * PaymentService
 * ══════════════════════════════════════════════════════════════════
 * afterCreate / afterUpdate / afterDelete:
 *   يُحدِّث current_balance على TreasuryAccount كـ denormalized cache
 *   للعرض السريع في الواجهة (بدل استدعاء getTreasuryBalanceAt() في كل مرة).
 *
 * direction (in/out):
 *   يُحدَّد تلقائياً من party_id + document_base_operation:
 *   - دفعة من عميل (sale)   → in  (يزيد الخزينة)
 *   - دفعة لمورد (purchase) → out (ينقص الخزينة)
 *   - إذا لم يكن هناك party (مصروف مثلاً) → out افتراضياً
 *
 * ملاحظة: current_balance هو cache فقط — المصدر الحقيقي هو
 * TreasuryBalanceService::getTreasuryBalanceAt().
 * ══════════════════════════════════════════════════════════════════
 */
class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model        = Payment::class;
    protected string $resourceName = 'payment';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * تحديد direction تلقائياً قبل الإنشاء إن لم يُرسَل من الواجهة.
     */
    protected function beforeCreate(array $data, $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection($data);
        }

        return $data;
    }

    protected function beforeUpdate(Model $item, array $data, $request): array
    {
        $data = parent::beforeUpdate($item, $data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection(
                array_merge($item->toArray(), $data)
            );
        }

        return $data;
    }

    /**
     * بعد إنشاء دفعة مؤكدة: زيادة/نقصان رصيد الخزينة.
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
    }

    /**
     * بعد تحديث دفعة: تصحيح رصيد الخزينة بالفرق.
     */
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $oldStatus    = $item->getOriginal('status');
        $oldAmount    = (float) $item->getOriginal('amount');
        $oldDirection = $item->getOriginal('direction');
        $oldAccountId = $item->getOriginal('treasury_account_id');

        // إذا تغيّر الحساب البنكي: نعكس التأثير على القديم ونطبّق على الجديد
        if ($oldAccountId !== $item->treasury_account_id) {
            if ($oldStatus === 'confirmed') {
                $this->adjustTreasuryBalance($oldAccountId, $oldAmount, $this->oppositeDirection($oldDirection));
            }
            if ($item->status === 'confirmed') {
                $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
            }
            return;
        }

        // نفس الحساب: احسب الفرق فقط
        $wasConfirmed = $oldStatus === 'confirmed';
        $isConfirmed  = $item->status === 'confirmed';

        if ($wasConfirmed) {
            $this->adjustTreasuryBalance($item->treasury_account_id, $oldAmount, $this->oppositeDirection($oldDirection));
        }

        if ($isConfirmed) {
            $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
        }
    }

    /**
     * بعد حذف دفعة مؤكدة: عكس التأثير على الخزينة.
     */
    protected function afterDelete(Model $item): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance(
            $item->treasury_account_id,
            $item->amount,
            $this->oppositeDirection($item->direction)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * تحديث current_balance كـ cache.
     */
    private function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }

    /**
     * تحديد direction من نوع العملية:
     *   - دفعة من عميل (sale)   → in
     *   - دفعة لمورد (purchase) → out
     *   - بدون party            → out (مصروف)
     */
    private function resolveDirection(array $data): string
    {
        if (empty($data['party_id'])) {
            return 'out';
        }

        // نتحقق من نوع المتعامل عبر partyType
        $partyTypeName = \Illuminate\Support\Facades\DB::table('parties as p')
            ->join('party_types as pt', 'p.party_type_id', '=', 'pt.id')
            ->where('p.id', $data['party_id'])
            ->value('pt.name');

        return match ($partyTypeName) {
            'client' => 'in',
            'supplier' => 'out',
            'both'   => $data['direction'] ?? 'in', // يتركه للواجهة تختار
            default  => 'out',
        };
    }

    private function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\PaymentModeRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code',
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdatePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code,' . $this->route('payment_mode'),
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\Paymentrequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // رقم الدفعة — يولَّد تلقائياً إذا لم يُرسَل
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->where('company_id', $companyId)],
            'payment_date'        => 'required|date',
            'amount'              => 'required|numeric|min:0.0001',

            // العملة — اختياري، افتراضي DZD
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',

            // طريقة الدفع والحساب
            'payment_mode_id'     => 'required|integer|exists:payment_modes,id',
            'treasury_account_id' => 'required|integer|exists:treasury_accounts,id',

            // الشيك المرتبط — مطلوب فقط إذا كانت طريقة الدفع شيك
            'check_id'            => 'nullable|integer|exists:checks,id',

            // الطرف (عميل أو مورد)
            'party_id'            => 'nullable|integer|exists:parties,id',

            // السنة المالية
            'fiscal_year_id'      => 'required|integer|exists:fiscal_years,id',

            // مرجع ومعلومات إضافية
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',

            // الحالة
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],

            // ربط الدفعة بمستندات تجارية (جدول document_payment pivot)
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required'        => 'تاريخ الدفعة مطلوب',
            'amount.required'              => 'مبلغ الدفعة مطلوب',
            'amount.min'                   => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_mode_id.required'     => 'طريقة الدفع مطلوبة',
            'treasury_account_id.required' => 'الحساب المالي مطلوب',
            'fiscal_year_id.required'      => 'السنة المالية مطلوبة',
            'payment_number.unique'        => 'رقم الدفعة مستخدم بالفعل',
            'status.in'                    => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}


class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('payment');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->ignore($id)->where('company_id', $companyId)],
            'payment_date'        => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',
            'payment_mode_id'     => 'sometimes|integer|exists:payment_modes,id',
            'treasury_account_id' => 'sometimes|integer|exists:treasury_accounts,id',
            'check_id'            => 'nullable|integer|exists:checks,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'              => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_number.unique'   => 'رقم الدفعة مستخدم بالفعل',
            'status.in'               => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StorePaymentModeRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StorePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code',
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}


```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StorePaymentRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // رقم الدفعة — يولَّد تلقائياً إذا لم يُرسَل
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->where('company_id', $companyId)],
            'payment_date'        => 'required|date',
            'amount'              => 'required|numeric|min:0.0001',

            // العملة — اختياري، افتراضي DZD
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',

            // طريقة الدفع والحساب
            'payment_mode_id'     => 'required|integer|exists:payment_modes,id',
            'treasury_account_id' => 'required|integer|exists:treasury_accounts,id',

            // الشيك المرتبط — مطلوب فقط إذا كانت طريقة الدفع شيك
            'check_id'            => 'nullable|integer|exists:checks,id',

            // الطرف (عميل أو مورد)
            'party_id'            => 'nullable|integer|exists:parties,id',

            // السنة المالية
            'fiscal_year_id'      => 'required|integer|exists:fiscal_years,id',

            // مرجع ومعلومات إضافية
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',

            // الحالة
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],

            // ربط الدفعة بمستندات تجارية (جدول document_payment pivot)
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required'        => 'تاريخ الدفعة مطلوب',
            'amount.required'              => 'مبلغ الدفعة مطلوب',
            'amount.min'                   => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_mode_id.required'     => 'طريقة الدفع مطلوبة',
            'treasury_account_id.required' => 'الحساب المالي مطلوب',
            'fiscal_year_id.required'      => 'السنة المالية مطلوبة',
            'payment_number.unique'        => 'رقم الدفعة مستخدم بالفعل',
            'status.in'                    => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}



```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdatePaymentModeRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdatePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code,' . $this->route('payment_mode'),
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdatePaymentRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('payment');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->ignore($id)->where('company_id', $companyId)],
            'payment_date'        => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',
            'payment_mode_id'     => 'sometimes|integer|exists:payment_modes,id',
            'treasury_account_id' => 'sometimes|integer|exists:treasury_accounts,id',
            'check_id'            => 'nullable|integer|exists:checks,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'              => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_number.unique'   => 'رقم الدفعة مستخدم بالفعل',
            'status.in'               => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\DocumentPaymentPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentPaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_payment');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\PaymentModePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentModePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment_mode');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment_mode');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment_mode');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment_mode');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment_mode');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment_mode');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment_mode');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\PaymentPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment');
    }
}
```

## Migrations

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_094104_create_payment_modes_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payment_modes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('requires_reference')->default(false);
            $table->boolean('is_cash')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payment_modes');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_094115_create_payments_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('payment_number', 50)->unique()->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete()->cascadeOnUpdate()->name('fk_payments_currency_id');
            $table->decimal('amount_local', 15, 4)->nullable()->comment('Amount in base currency');
            $table->foreignId('payment_mode_id')->constrained('payment_modes')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('check_id')->nullable()->constrained('checks')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('reference', 100)->nullable()->comment('Check number, transfer reference, etc.');
            $table->string('bank_reference', 150)->nullable()->comment('Bank transaction reference');
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('confirmed')->index()->comment('confirmed, pending, cancelled');
            $table->boolean('is_reconciled')->default(false)->index();
            $table->date('reconciliation_date')->nullable();
            $table->timestampTz('clearing_date')->nullable()->comment('Date the payment cleared the bank');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'payment_date', 'status']);
            $table->index(['company_id', 'party_id', 'payment_date']);
            $table->index(['company_id', 'treasury_account_id', 'payment_date']);
            $table->index(['company_id', 'status', 'payment_date', 'treasury_account_id'], 'idx_payment_status_date_account');
            $table->index(['company_id', 'fiscal_year_id', 'payment_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payments');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_094120_create_document_payment_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'commercial_document_id', 'payment_id']);
            $table->index('payment_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_payment');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2026_06_14_000001_drop_initial_balance_add_payment_index.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1. حذف parties.initial_balance
 *    السبب: opening_balances_parties أصبح المصدر الوحيد للرصيد الافتتاحي
 *    مع دعم تعدد السنوات المالية — وجود الحقلين معاً يعني مصدرين للحقيقة.
 *
 * 2. إضافة فهرس مركّب على payments لتسريع استعلام PartyBalanceService
 *    الاستعلام: WHERE company_id + party_id + fiscal_year_id + status + payment_date
 *    الفهارس الموجودة لا تغطي fiscal_year_id + status معاً في نفس الفهرس.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. حذف initial_balance من parties
        Schema::table('parties', function (Blueprint $table) {
            $table->dropColumn('initial_balance');
        });

        // 2. فهرس مركّب لاستعلام رصيد المتعامل (PartyBalanceService::getBalanceAt)
        Schema::table('payments', function (Blueprint $table) {
            $table->index(
                ['company_id', 'party_id', 'fiscal_year_id', 'status', 'payment_date'],
                'idx_payments_party_balance_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::table('parties', function (Blueprint $table) {
            $table->decimal('initial_balance', 15, 4)->default(0.00);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_party_balance_lookup');
        });
    }
};

```

