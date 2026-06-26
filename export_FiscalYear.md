# Module Export: FISCALYEAR
Generated at: 2026-06-25 23:48:51

## Models

### 📁 C:\xampp\htdocs\sales_managements\app\Models\FiscalYear.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class FiscalYear extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'fiscal_years';

    protected $fillable = [
        'company_id',
        'name',
        'start_date',
        'end_date',
        'is_closed',
        'closed_at',
        'closed_by',
        'is_current',
        'closing_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
        'closed_at' => 'date',
        'is_current' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name'];
    public static array $filterable = ['is_closed', 'is_current'];
    public static array $sortable = ['id', 'name', 'start_date', 'end_date', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'closedBy', 'commercialDocuments', 'stockMovements', 'payments',
        'expenses', 'openingBalancesStock', 'openingBalancesParties',
        'openingBalancesTreasury', 'posSessions'
    ];
    public static string $defaultSort = 'start_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['fiscal_years'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function openingBalancesStock(): HasMany
    {
        return $this->hasMany(OpeningBalanceStock::class);
    }

    public function openingBalancesParties(): HasMany
    {
        return $this->hasMany(OpeningBalanceParty::class);
    }

    public function openingBalancesTreasury(): HasMany
    {
        return $this->hasMany(OpeningBalanceTreasury::class);
    }

    public function posSessions(): HasMany
    {
        return $this->hasMany(PosSession::class);
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_current', true);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('is_closed', false);
    }

    public function scopeClosed(Builder $query): Builder
    {
        return $query->where('is_closed', true);
    }

    public function close(int $userId, ?string $notes = null): bool
    {
        if ($this->is_closed) {
            return false;
        }
        return $this->update([
            'is_closed' => true,
            'closed_at' => now(),
            'closed_by' => $userId,
            'closing_notes' => $notes,
            'is_current' => false,
        ]);
    }

    public function setCurrent(): bool
    {
        static::where('id', '!=', $this->id)->update(['is_current' => false]);
        return $this->update(['is_current' => true]);
    }

    public function isActive(): bool
    {
        return !$this->is_closed && now()->between($this->start_date, $this->end_date);
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\Traits\BelongsToFiscalYear.php
```php
<?php

namespace App\Models\Traits;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Trait لمنع التعديل على سنة مالية مقفلة
 * مع تحسينات الأداء وسلامة البيانات
 */
trait BelongsToFiscalYear
{
    /**
     * Cache لتخزين حالات السنوات المقفلة
     * يتم تحديثها فقط عند إقفال سنة جديدة
     */
    protected static array $closedYearsCache = [];

    protected static function bootBelongsToFiscalYear(): void
    {
        // تحميل السنوات المقفلة مرة واحدة فقط
        static::loadClosedYears();

        // 1. منع الإنشاء في سنة مقفلة
        static::creating(function ($model) {
            $model->validateFiscalYearStatus();
        });

        // 2. منع التعديل في سنة مقفلة
        static::updating(function ($model) {
            // تحقق من السنة الأصلية
            if ($model->getOriginal('fiscal_year_id')) {
                $model->validateFiscalYearStatus($model->getOriginal('fiscal_year_id'));
            }

            // تحقق من السنة الجديدة إذا تم تغييرها
            if ($model->isDirty('fiscal_year_id')) {
                $model->validateFiscalYearStatus();
            }
        });

        // 3. منع الحذف من سنة مقفلة
        static::deleting(function ($model) {
            $model->validateFiscalYearStatus();
        });
    }

    /**
     * تحميل السنوات المقفلة من Cache أو DB (مرة واحدة فقط)
     */
    protected static function loadClosedYears(): void
    {
        if (! empty(static::$closedYearsCache)) {
            return;
        }

        try {
            static::$closedYearsCache = Cache::remember(
                'closed_fiscal_years',
                now()->addHours(24),
                fn () => FiscalYear::where('is_closed', true)
                    ->pluck('id')
                    ->toArray()
            );
        } catch (\Throwable) {
            static::$closedYearsCache = [];
        }
    }

    /**
     * التحقق من حالة السنة المالية (بدون استعلامات إضافية)
     */
    protected function validateFiscalYearStatus(?int $yearId = null): void
    {
        $yearId = $yearId ?? $this->fiscal_year_id;

        if (!$yearId) {
            return; // لا سنة مالية = العملية مسموحة
        }

        // ✅ فحص سريع من الـ Cache
        if (in_array($yearId, static::$closedYearsCache)) {
            throw new FiscalYearClosedException(
                "العملية ممنوعة: السنة المالية مقفلة (ID: {$yearId})"
            );
        }
    }

    /**
     * علاقة Eloquent مع السنة المالية
     */
    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    /**
     * يتم استدعاؤها عند إقفال سنة مالية لتحديث الـ Cache
     */
    public static function refreshClosedYearsCache(): void
    {
        Cache::forget('closed_fiscal_years');
        static::$closedYearsCache = [];
        static::loadClosedYears();
    }
}

```

## Controllers

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\FiscalYearController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalYearResource;
use App\Services\FiscalYearService;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FiscalYearController extends BaseApiController
{
    protected string $resourceName = 'fiscal_year';
    protected ?string $resourceClass = FiscalYearResource::class;

    public function __construct(private FiscalYearService $service)
    {
        parent::__construct();
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = FiscalYear::query();

            if ($request->has('include')) {
                $includes = array_map('trim', explode(',', $request->get('include')));
                $allowed  = ['closedBy'];
                $query->with(array_intersect($allowed, $includes));
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $years   = $query->orderBy('start_date', 'desc')->paginate($perPage);

            return $this->successResponse(
                $years,
                'تم جلب السنوات المالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function current(Request $request): JsonResponse
    {
        try {
            $year = $this->service->getCurrent();
            return $this->successResponse(
                $year ? new FiscalYearResource($year) : null,
                'تم جلب السنة المالية الحالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    public function open(Request $request): JsonResponse
    {
        try {
            $years = $this->service->getOpen();
            return $this->successResponse(
                FiscalYearResource::collection($years),
                'تم جلب السنوات المالية المفتوحة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'open');
        }
    }

    public function close(Request $request, int $id): JsonResponse
    {
        try {
            $year  = FiscalYear::findOrFail($id);
            $notes = $request->get('notes');
            $year  = $this->service->close($year, auth()->id(), $notes);

            $year->load('closedBy');

            return $this->successResponse(
                new FiscalYearResource($year),
                'تم غلق السنة المالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'close');
        }
    }

    /**
     * حذف السنة المالية مع كل البيانات المرتبطة بها
     */
    public function destroy($id): JsonResponse
    {
        try {
            $year = FiscalYear::findOrFail($this->extractId($id));
            $this->authorizeAction('delete', $year);

            if ($year->is_closed) {
                return $this->errorResponse('لا يمكن حذف سنة مالية مقفلة.', 400);
            }

            if ($year->is_current) {
                return $this->errorResponse('لا يمكن حذف السنة المالية الحالية. عيّن سنة أخرى كحالية أولاً.', 400);
            }

            $relatedCounts = $this->getRelatedCounts($year);

            DB::transaction(function () use ($year) {
                DB::table('commercial_document_lines')
                    ->whereIn('commercial_document_id', $year->commercialDocuments()->pluck('id'))
                    ->delete();
                $year->commercialDocuments()->delete();
                $year->payments()->delete();
                $year->expenses()->delete();
                $year->stockMovements()->delete();
                $year->openingBalancesTreasury()->delete();
                $year->openingBalancesStock()->delete();
                $year->openingBalancesParties()->delete();
                $year->delete();
            });

            return $this->successResponse(
                ['deleted' => $relatedCounts],
                'تم حذف السنة المالية وكل البيانات المرتبطة بها بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    /**
     * استيراد الأرصدة الافتتاحية من سنة أخرى
     * POST /fiscal-years/{year}/import-from/{sourceYear}
     */
    public function importBalances(Request $request): JsonResponse
    {
        try {
            $yearId       = (int) $request->route('year');
            $sourceYearId = (int) $request->route('sourceYear');
            $year         = FiscalYear::findOrFail($yearId);
            $sourceYear   = FiscalYear::findOrFail($sourceYearId);

            if ($year->company_id !== $sourceYear->company_id) {
                return $this->errorResponse('يجب أن تكون السنتان لنفس الشركة.', 400);
            }

            $importStock    = $request->boolean('stock', true);
            $importParties  = $request->boolean('parties', true);
            $importTreasury = $request->boolean('treasury', true);

            $imported = ['stock' => 0, 'parties' => 0, 'treasury' => 0];

            DB::transaction(function () use ($year, $sourceYear, $importStock, $importParties, $importTreasury, &$imported) {
                if ($importStock) {
                    $rows = DB::table('opening_balances_stock')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'       => $year->company_id,
                            'fiscal_year_id'   => $year->id,
                            'product_id'       => $r->product_id,
                            'warehouse_id'     => $r->warehouse_id,
                            'opening_quantity' => $r->opening_quantity,
                            'opening_value'    => $r->opening_value,
                            'lot_number'       => $r->lot_number,
                            'manufacturing_date' => $r->manufacturing_date,
                            'expiration_date'  => $r->expiration_date,
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_stock')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'],
                            ['opening_quantity', 'opening_value', 'updated_at']
                        );
                        $imported['stock'] = count($rows);
                    }
                }

                if ($importParties) {
                    $rows = DB::table('opening_balances_parties')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'     => $year->company_id,
                            'fiscal_year_id' => $year->id,
                            'party_id'       => $r->party_id,
                            'opening_balance'=> $r->opening_balance,
                            'balance_type'   => $r->balance_type,
                            'created_at'     => now(),
                            'updated_at'     => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_parties')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'party_id'],
                            ['opening_balance', 'balance_type', 'updated_at']
                        );
                        $imported['parties'] = count($rows);
                    }
                }

                if ($importTreasury) {
                    $rows = DB::table('opening_balances_treasury')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'          => $year->company_id,
                            'fiscal_year_id'      => $year->id,
                            'treasury_account_id' => $r->treasury_account_id,
                            'opening_balance'     => $r->opening_balance,
                            'created_at'          => now(),
                            'updated_at'          => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_treasury')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'treasury_account_id'],
                            ['opening_balance', 'updated_at']
                        );
                        $imported['treasury'] = count($rows);
                    }
                }
            });

            return $this->successResponse($imported, 'تم استيراد الأرصدة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'importBalances');
        }
    }

    /**
     * ترحيل الأرصدة الافتتاحية من سنة إلى أخرى
     * POST /fiscal-years/{year}/transfer-to/{targetYear}
     */
    public function transferBalances(Request $request, int $yearId, int $targetYearId): JsonResponse
    {
        return $this->importBalances($request, $targetYearId, $yearId);
    }

    /**
     * إحصائيات البيانات المرتبطة قبل الحذف
     */
    public function relatedData(Request $request, int $id): JsonResponse
    {
        try {
            $year = FiscalYear::findOrFail($id);
            return $this->successResponse($this->getRelatedCounts($year));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'relatedData');
        }
    }

    private function getRelatedCounts(FiscalYear $year): array
    {
        return [
            'documents'    => $year->commercialDocuments()->count(),
            'payments'     => $year->payments()->count(),
            'expenses'     => $year->expenses()->count(),
            'stock_movements' => $year->stockMovements()->count(),
            'stock_balances'  => $year->openingBalancesStock()->count(),
            'party_balances'  => $year->openingBalancesParties()->count(),
            'treasury_balances' => $year->openingBalancesTreasury()->count(),
            'pos_sessions' => $year->posSessions()->count(),
            'total'        => $year->commercialDocuments()->count()
                           + $year->payments()->count()
                           + $year->expenses()->count()
                           + $year->stockMovements()->count()
                           + $year->openingBalancesStock()->count()
                           + $year->openingBalancesParties()->count()
                           + $year->openingBalancesTreasury()->count()
                           + $year->posSessions()->count(),
        ];
    }

    protected function getService(): FiscalYearService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return FiscalYear::class;
    }
}

```

## Services

### 📁 C:\xampp\htdocs\sales_managements\app\Services\Accounting\FiscalYearClosureService.php
```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use App\Models\Traits\BelongsToFiscalYear; // ✅ إصلاح: namespace صحيح
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * خدمة إقفال السنة المالية مع نقل الأرصدة
 * Performance: استخدام استعلامات Bulk بدلاً من Loops
 */
class FiscalYearClosureService
{
    /**
     * إقفال السنة المالية بشكل آمن
     */
    public function closeYear(FiscalYear $yearToClose, int $closedBy): FiscalYear
    {
        // 1. التحقق الأولي
        $this->validateBeforeClosure($yearToClose);

        try {
            return DB::transaction(function () use ($yearToClose, $closedBy) {

                // 2. إنشاء السنة الجديدة
                $newYear = $this->createNextFiscalYear($yearToClose);

                // 3. نقل الأرصدة (Performance Optimized)
                $this->transferAccountBalances($yearToClose, $newYear);
                $this->transferPartyBalances($yearToClose, $newYear);
                $this->transferStockBalances($yearToClose, $newYear);

                // 4. إقفال السنة القديمة
                $yearToClose->update([
                    'is_closed' => true,
                    'is_current' => false,
                    'closed_at' => now(),
                    'closed_by' => $closedBy,
                ]);

                // 5. تفعيل السنة الجديدة
                $newYear->update(['is_current' => true]);

                // 6. تحديث الـ Cache
                BelongsToFiscalYear::refreshClosedYearsCache();

                Log::info("تم إقفال السنة المالية {$yearToClose->name} بنجاح");

                return $newYear;
            });
        } catch (Exception $e) {
            Log::error("فشل إقفال السنة المالية: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * التحقق من إمكانية الإقفال
     */
    protected function validateBeforeClosure(FiscalYear $year): void
    {
        if ($year->is_closed) {
            throw new FiscalYearClosedException('السنة المالية مقفلة بالفعل');
        }

        // ✅ تحقق من القيود غير المتوازنة
        $unbalancedCount = $year->journalEntries()
            ->where('is_balanced', false)
            ->count();

        if ($unbalancedCount > 0) {
            throw new Exception("لا يمكن الإقفال: يوجد {$unbalancedCount} قيود غير متوازنة");
        }

        // ✅ تحقق من المستندات المفتوحة (Draft)
        $openDocumentsCount = $year->commercialDocuments()
            ->where('status', 'draft')
            ->count();

        if ($openDocumentsCount > 0) {
            throw new Exception("لا يمكن الإقفال: يوجد {$openDocumentsCount} مستندات بحالة مسودة");
        }
    }

    /**
     * إنشاء السنة المالية الجديدة
     */
    protected function createNextFiscalYear(FiscalYear $currentYear): FiscalYear
    {
        $nextYearName = (int)$currentYear->name + 1;

        return FiscalYear::create([
            'name' => (string)$nextYearName,
            'start_date' => $currentYear->end_date->addDay(),
            'end_date' => $currentYear->end_date->copy()->addYear(),
            'is_current' => false, // سيتم تفعيلها لاحقاً
            'is_closed' => false,
        ]);
    }

    /**
     * نقل أرصدة الحسابات (Performance: Bulk Insert)
     */
    protected function transferAccountBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ استعلام واحد لحساب كل الأرصدة
        $balances = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.id', '=', 'jel.journal_entry_id')
            ->where('je.fiscal_year_id', $oldYear->id)
            ->where('je.status', 'posted') // فقط القيود المحققة
            ->select(
                'jel.account_id',
                DB::raw('SUM(jel.debit) as total_debit'),
                DB::raw('SUM(jel.credit) as total_credit')
            )
            ->groupBy('jel.account_id')
            ->get();

        // ✅ إدراج جماعي (Bulk Insert)
        $openingBalances = [];
        foreach ($balances as $balance) {
            $netBalance = $balance->total_debit - $balance->total_credit;

            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'account_id' => $balance->account_id,
                'opening_debit' => $netBalance > 0 ? $netBalance : 0,
                'opening_credit' => $netBalance < 0 ? abs($netBalance) : 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_accounts')->insert($openingBalances);
        }
    }

    /**
     * نقل أرصدة الأطراف (الزبائن/الموردين)
     */
    protected function transferPartyBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ حساب الأرصدة من المستندات التجارية
        $partyBalances = DB::table('commercial_documents')
            ->where('fiscal_year_id', $oldYear->id)
            ->whereNotNull('party_id')
            ->where('status', '!=', 'cancelled')
            ->select(
                'party_id',
                DB::raw('SUM(remaining_amount) as balance')
            )
            ->groupBy('party_id')
            ->having('balance', '!=', 0)
            ->get();

        $openingBalances = [];
        foreach ($partyBalances as $balance) {
            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'party_id' => $balance->party_id,
                'opening_balance' => abs($balance->balance),
                'balance_type' => $balance->balance > 0 ? 'debit' : 'credit',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_parties')->insert($openingBalances);
        }
    }

    /**
     * نقل أرصدة المخزون
     */
    protected function transferStockBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ حساب الرصيد النهائي لكل صنف في كل مستودع
        $stockBalances = DB::table('stock_movements')
            ->where('fiscal_year_id', $oldYear->id)
            ->where('is_validated', true)
            ->select(
                'product_id',
                'warehouse_id',
                DB::raw('SUM(
                    CASE
                        WHEN stock_movement_type_id IN (
                            SELECT id FROM stock_movement_types WHERE direction = 1
                        ) THEN quantity
                        WHEN stock_movement_type_id IN (
                            SELECT id FROM stock_movement_types WHERE direction = -1
                        ) THEN -quantity
                        ELSE 0
                    END
                ) as final_quantity'),
                DB::raw('AVG(cost_price) as avg_cost_price')
            )
            ->groupBy('product_id', 'warehouse_id')
            ->having('final_quantity', '>', 0)
            ->get();

        $openingBalances = [];
        foreach ($stockBalances as $balance) {
            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'product_id' => $balance->product_id,
                'warehouse_id' => $balance->warehouse_id,
                'opening_quantity' => $balance->final_quantity,
                'opening_value' => $balance->final_quantity * $balance->avg_cost_price,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_stock')->insert($openingBalances);
        }
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\FiscalYearClosureService.php
```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use App\Models\Traits\BelongsToFiscalYear;
use App\Services\PartyBalanceService;
use App\Services\TreasuryBalanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * FiscalYearClosureService — النسخة المدمجة النهائية
 * ══════════════════════════════════════════════════════════════════
 * إصلاحات عن النسخة الأصلية:
 *
 * 1. transferPartyBalances:
 *    قبل: SUM(remaining_amount) + status!='cancelled' → خاطئ
 *    بعد: PartyBalanceService::getBalanceAt() → نفس معادلة العرض
 *
 * 2. transferStockBalances:
 *    قبل: AVG(cost_price) → خاطئ محاسبياً
 *    بعد: PMP = SUM(qty×price)/SUM(qty) → صحيح
 *
 * 3. transferStockBalances:
 *    قبل: Subquery لكل direction → بطيء
 *    بعد: JOIN مباشر مع stock_movement_types → أسرع
 *
 * 4. createNextFiscalYear:
 *    قبل: company_id مفقود → bug
 *    بعد: company_id مضاف صراحةً
 *
 * 5. validateBeforeClosure:
 *    قبل: status='draft' على commercial_documents → عمود غير موجود
 *    بعد: is_locked=false → صحيح
 *    قبل: journalEntries() → جدول غير موجود في النظام الحالي
 *    بعد: تحقق محذوف (لا محاسبة SCF في هذا النظام)
 *
 * 6. upsert() بدل insert():
 *    آمن لإعادة التشغيل — UNIQUE constraints لا تسبب فشلاً
 *
 * 7. transferTreasuryBalances: جديد كلياً
 *    ينقل أرصدة الخزينة = العمود الثالث في جدول التناظر
 *
 * 8. whereNull('deleted_at') على كل DB::table() queries
 *    SoftDeletes لا تعمل تلقائياً مع DB::table()
 *
 * جدول التناظر مكتمل 100%:
 *   المخزون      → transferStockBalances   → opening_balances_stock
 *   المتعاملون   → transferPartyBalances   → opening_balances_parties
 *   الخزينة      → transferTreasuryBalances → opening_balances_treasury
 * ══════════════════════════════════════════════════════════════════
 */
class FiscalYearClosureService
{
    public function __construct(
        private PartyBalanceService    $partyBalanceService,
        private TreasuryBalanceService $treasuryBalanceService,
    ) {}

    public function closeYear(FiscalYear $yearToClose, int $closedBy): FiscalYear
    {
        $this->validateBeforeClosure($yearToClose);

        try {
            return DB::transaction(function () use ($yearToClose, $closedBy) {

                $newYear = $this->createNextFiscalYear($yearToClose);

                $this->transferPartyBalances($yearToClose, $newYear);
                $this->transferStockBalances($yearToClose, $newYear);
                $this->transferTreasuryBalances($yearToClose, $newYear);

                $yearToClose->update([
                    'is_closed'  => true,
                    'is_current' => false,
                    'closed_at'  => now(),
                    'closed_by'  => $closedBy,
                ]);

                $newYear->update(['is_current' => true]);

                // تحديث كاش BelongsToFiscalYear trait
                BelongsToFiscalYear::refreshClosedYearsCache();

                Log::info("تم إقفال السنة المالية {$yearToClose->name} — السنة الجديدة: {$newYear->name}");

                return $newYear;
            });
        } catch (Exception $e) {
            Log::error("فشل إقفال السنة المالية {$yearToClose->name}: {$e->getMessage()}");
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    protected function validateBeforeClosure(FiscalYear $year): void
    {
        if ($year->is_closed) {
            throw new FiscalYearClosedException('السنة المالية مقفلة بالفعل.');
        }

        // is_locked=false → مستند غير مؤكد (مسودة)
        // commercial_documents لا يحتوي عمود 'status' مباشرة
        $openDocs = $year->commercialDocuments()
            ->where('is_locked', false)
            ->count();

        if ($openDocs > 0) {
            throw new Exception(
                "لا يمكن الإقفال: يوجد {$openDocs} مستند غير مؤكد."
            );
        }
    }

    protected function createNextFiscalYear(FiscalYear $currentYear): FiscalYear
    {
        return FiscalYear::create([
            'company_id' => $currentYear->company_id, // ✅ مطلوب صراحةً
            'name'       => (string) ((int) $currentYear->name + 1),
            'start_date' => $currentYear->end_date->copy()->addDay(),
            'end_date'   => $currentYear->end_date->copy()->addYear(),
            'is_current' => false,
            'is_closed'  => false,
        ]);
    }

    /**
     * ترحيل أرصدة المتعاملين.
     *
     * Fix: يستخدم PartyBalanceService::getBalanceAt() بدل SUM(remaining_amount)
     * لأن remaining_amount يتجاهل الرصيد الافتتاحي للسنة المُقفلة.
     *
     * يجمع المتعاملين من المستندات والدفعات معاً لتجنب إغفال
     * من لديهم دفعات فقط بدون مستندات.
     *
     * upsert() → آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + party_id)
     */
    protected function transferPartyBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $partyIds = DB::table('commercial_documents')
            ->where('fiscal_year_id', $oldYear->id)
            ->whereNotNull('party_id')
            ->whereNull('deleted_at')
            ->distinct()
            ->pluck('party_id')
            ->merge(
                DB::table('payments')
                    ->where('fiscal_year_id', $oldYear->id)
                    ->whereNotNull('party_id')
                    ->whereNull('deleted_at')
                    ->distinct()
                    ->pluck('party_id')
            )
            ->unique();

        $rows = [];
        foreach ($partyIds as $partyId) {
            $result  = $this->partyBalanceService->getBalanceAt(
                $partyId,
                $oldYear->end_date->toDateString()
            );
            $balance = $result['current_balance'];

            if (abs($balance) < 0.0001) continue;

            $rows[] = [
                'company_id'      => $oldYear->company_id,
                'fiscal_year_id'  => $newYear->id,
                'party_id'        => $partyId,
                'opening_balance' => abs($balance),
                'balance_type'    => $balance >= 0 ? 'debit' : 'credit',
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_parties')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'party_id'],
            ['opening_balance', 'balance_type', 'updated_at']
        );
    }

    /**
     * ترحيل أرصدة المخزون.
     *
     * Fix 1: JOIN مباشر مع stock_movement_types بدل Subquery داخل CASE
     * Fix 2: PMP = SUM(qty×cost_price)/SUM(qty) بدل AVG(cost_price)
     * Fix 3: whereNull('deleted_at') — SoftDeletes لا تعمل مع DB::table()
     * Fix 4: upsert() بدل insert() — آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + product_id + warehouse_id)
     */
    protected function transferStockBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $stockBalances = DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'sm.stock_movement_type_id', '=', 'smt.id')
            ->where('sm.fiscal_year_id', $oldYear->id)
            ->where('sm.is_validated',   true)
            ->whereNull('sm.deleted_at')
            ->select(
                'sm.product_id',
                'sm.warehouse_id',
                DB::raw("
                    SUM(
                        CASE WHEN smt.direction =  1 THEN  sm.quantity
                             WHEN smt.direction = -1 THEN -sm.quantity
                             ELSE 0 END
                    ) as final_quantity
                "),
                // PMP = SUM(qty_in × cost_price) / SUM(qty_in)
                DB::raw("
                    SUM(CASE WHEN smt.direction = 1 THEN sm.quantity * sm.cost_price ELSE 0 END)
                    /
                    NULLIF(SUM(CASE WHEN smt.direction = 1 THEN sm.quantity ELSE 0 END), 0)
                    as pmp_cost_price
                ")
            )
            ->groupBy('sm.product_id', 'sm.warehouse_id')
            ->having('final_quantity', '>', 0)
            ->get();

        $rows = [];
        foreach ($stockBalances as $b) {
            $rows[] = [
                'company_id'       => $oldYear->company_id,
                'fiscal_year_id'   => $newYear->id,
                'product_id'       => $b->product_id,
                'warehouse_id'     => $b->warehouse_id,
                'opening_quantity' => $b->final_quantity,
                'opening_value'    => round(
                    $b->final_quantity * ($b->pmp_cost_price ?? 0), 4
                ),
                'created_at'       => now(),
                'updated_at'       => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_stock')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'],
            ['opening_quantity', 'opening_value', 'updated_at']
        );
    }

    /**
     * ترحيل أرصدة الخزينة — جديد كلياً.
     *
     * يستخدم TreasuryBalanceService::getTreasuryBalanceAt()
     * نفس معادلة العرض: opening + in - out
     *
     * upsert() → آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + treasury_account_id)
     */
    protected function transferTreasuryBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $accountIds = DB::table('treasury_accounts')
            ->where('company_id', $oldYear->company_id)
            ->whereNull('deleted_at')
            ->pluck('id');

        $rows = [];
        foreach ($accountIds as $accountId) {
            $result  = $this->treasuryBalanceService->getTreasuryBalanceAt(
                $accountId,
                $oldYear->end_date->toDateString()
            );
            $balance = $result['current_balance'];

            if (abs($balance) < 0.0001) continue;

            $rows[] = [
                'company_id'          => $oldYear->company_id,
                'fiscal_year_id'      => $newYear->id,
                'treasury_account_id' => $accountId,
                'opening_balance'     => $balance,
                'created_at'          => now(),
                'updated_at'          => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_treasury')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'treasury_account_id'],
            ['opening_balance', 'updated_at']
        );
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\FiscalYearService.php
```php
<?php

namespace App\Services;

use App\Models\FiscalYear;
use App\Services\Accounting\FiscalYearClosureService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ✅ إصلاح نهائي لـ FiscalYearService
 *
 * المشاكل السابقة:
 * 1. FiscalYear::refreshClosedYearsCache() → method غير موجودة على Model
 * 2. الـ close() لا يستخدم FiscalYearClosureService مما يتسبب في 500
 */
class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model      = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';

    public function __construct(
        private FiscalYearClosureService $closureService
    ) {}

        protected function getResourceName(): string
    {
        return 'fiscal_year';
    }


    public function getCurrent(): ?FiscalYear
    {
        return FiscalYear::where('is_current', true)->first();
    }

    public function getOpen()
    {
        return FiscalYear::where('is_closed', false)->get();
    }

    /**
     * ✅ إصلاح: استخدام FiscalYearClosureService بدل year->close() مباشرة
     *    FiscalYearClosureService يتولى:
     *      - التحقق من القيود غير المتوازنة
     *      - إنشاء السنة الجديدة
     *      - نقل الأرصدة
     *      - الإقفال الفعلي
     *
     * @throws \Exception إذا فشل التحقق
     */
    public function close(FiscalYear $year, int $userId, ?string $notes = null): FiscalYear
    {
        // ✅ تحديث closing_notes قبل استدعاء الـ Service
        if ($notes) {
            $year->update(['closing_notes' => $notes]);
            $year->refresh();
        }

        // ✅ استخدام الـ Closure Service الكامل الذي يتولى كل الخطوات
        $newYear = $this->closureService->closeYear($year, $userId);

        // ✅ مسح الكاش بأمان بدون استدعاء method غير موجودة
        $this->clearFiscalYearCache();

        return $newYear;
    }

    /**
     * مسح كاش السنوات المالية — آمن لجميع cache drivers
     */
    private function clearFiscalYearCache(): void
    {
        try {
            $driver = config('cache.default', 'file');

            if (in_array($driver, ['redis', 'memcached', 'dynamodb'])) {
                Cache::tags(['fiscal_years'])->flush();
            } else {
                // file / database cache لا تدعم tags
                foreach (['fiscal_years_closed', 'fiscal_years_current', 'fiscal_years_all', 'current_fiscal_year'] as $key) {
                    Cache::forget($key);
                }
            }
        } catch (\Throwable $e) {
            // لا تُفشل العملية بسبب مشكلة في الكاش
            Log::warning("فشل مسح كاش السنوات المالية: {$e->getMessage()}");
        }
    }
}

```

## Requests

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\Fiscalyearrequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'       => ['required', 'string', 'max:50',
                              Rule::unique('fiscal_years', 'name')->where('company_id', $companyId)],
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'اسم السنة المالية مطلوب (مثال: 2025)',
            'name.unique'         => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'start_date.required' => 'تاريخ البداية مطلوب',
            'end_date.required'   => 'تاريخ النهاية مطلوب',
            'end_date.after'      => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}


class UpdateFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('fiscal_year');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'          => ['sometimes', 'string', 'max:50',
                                 Rule::unique('fiscal_years', 'name')->ignore($id)->where('company_id', $companyId)],
            // لا يُسمح بتعديل التواريخ إذا كانت السنة مغلقة — يتحقق Controller
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after:start_date',
            'is_current'    => 'nullable|boolean',
            // closing_notes فقط عند الإغلاق — يُرسَل من FiscalYearController::close()
            'closing_notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique'    => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreFiscalYearRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StoreFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'       => ['required', 'string', 'max:50',
                              Rule::unique('fiscal_years', 'name')->where('company_id', $companyId)],
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'اسم السنة المالية مطلوب (مثال: 2025)',
            'name.unique'         => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'start_date.required' => 'تاريخ البداية مطلوب',
            'end_date.required'   => 'تاريخ النهاية مطلوب',
            'end_date.after'      => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}



```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateFiscalYearRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdateFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('fiscal_year');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'          => ['sometimes', 'string', 'max:50',
                                 Rule::unique('fiscal_years', 'name')->ignore($id)->where('company_id', $companyId)],
            // لا يُسمح بتعديل التواريخ إذا كانت السنة مغلقة — يتحقق Controller
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after:start_date',
            'is_current'    => 'nullable|boolean',
            // closing_notes فقط عند الإغلاق — يُرسَل من FiscalYearController::close()
            'closing_notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique'    => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}

```

## Policies

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\FiscalYearPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\Log;

class FiscalYearPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function create(User $user): bool
    {
        Log::info('FiscalYearPolicy::create', [
            'user_id' => $user->id,
            'roles' => $user->getRoleNames(),
            'can_manage' => $user->can('manage_fiscal_year'),
        ]);
        return $user->can('manage_fiscal_year');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }
}

```

