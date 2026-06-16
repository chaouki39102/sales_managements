# Module Export: PartyBalance
Generated at: 2026-06-16 13:25:44

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\PartyBalanceController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\PartyBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PartyBalanceController extends BaseApiController
{
    protected string $resourceName = 'party_balance';
    protected ?string $resourceClass = null; // لا نحتاج Resource

    public function __construct(private PartyBalanceService $balanceService)
    {
        parent::__construct();
    }

    /**
     * GET /{company}/party-balances
     * الفلاتر المدعومة: date, party_type_id, search (يدعمها ApiListService)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', \App\Models\Party::class);

            $date = $request->input('date', now()->toDateString());
            $partyTypeId = $request->input('party_type_id');
            $search = $request->input('search');

            $balances = $this->balanceService->getAllBalancesAt($date, $partyTypeId, $search);

            return $this->successResponse($balances, 'تم جلب الأرصدة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    /**
     * GET /{company}/party-balances/{partyId}
     */
    public function show($id): JsonResponse
    {
        try {
            $this->authorizeAction('view', \App\Models\Party::class);
            $partyId = $this->extractId($id);
            $date = request()->input('date', now()->toDateString());
            $balance = $this->balanceService->getBalanceAt($partyId, $date);
            return $this->successResponse($balance, 'تم جلب الرصيد بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // لا نحتاج store/update/destroy لأن الأرصدة تُحسب تلقائياً أو تُعدّل عبر نقاط أخرى
}

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\PartyBalanceService.php
```php
<?php

namespace App\Services;

use App\Core\Traits\ResolvesFiscalYear;
use App\Models\OpeningBalanceParty;
use Illuminate\Support\Facades\DB;

/**
 * PartyBalanceService
 * ══════════════════════════════════════════════════════════════════
 * Mirrors InventoryStockService::getStockAt() exactly.
 *
 * Formula:
 *   balance = opening_balance (resolved fiscal year)
 *           + SUM(net_to_pay — sale docs,     affects_accounting=true, is_locked=true)
 *           - SUM(net_to_pay — purchase docs, affects_accounting=true, is_locked=true)
 *           - SUM(payments.amount — status=confirmed)
 *   Scoped to: company_id + fiscal_year_id + date <= $date
 *
 * Sign convention:
 *   opening: balance_type=debit → +, credit → -
 *   sale docs (FV, AV ...)     → +
 *   purchase docs (FA, AA ...) → -
 *   payments                   → -
 *
 * Uses ResolvesFiscalYear trait — same resolution logic as
 * InventoryStockService (single source of truth).
 *
 * SoftDeletes: whereNull('deleted_at') on all DB::table() queries.
 * ══════════════════════════════════════════════════════════════════
 */
class PartyBalanceService
{
    use ResolvesFiscalYear;

    public function __construct(
        private CompanyContextService $companyContext
    ) {}

    /**
     * @throws \App\Core\Exceptions\BusinessRuleException
     */
    public function getBalanceAt(int $partyId, string $date): array
    {
        $companyId    = $this->companyContext->get();
        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        // 1. Opening balance for the resolved fiscal year
        $opening       = OpeningBalanceParty::query()
            ->where('company_id',     $companyId)
            ->where('party_id',       $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->first();

        $openingAmount = $opening?->signedAmount() ?? 0.0;

        // 2. Sale/purchase documents within fiscal year up to $date
        $documentsBalance = DB::table('commercial_documents as cd')
            ->join(
                'document_types as dt',
                'cd.document_type_id',
                '=',
                'dt.id'
            )
            ->join(
                'document_base_operations as dbo',
                'dt.document_base_operation_id',
                '=',
                'dbo.id'
            )
            ->where('cd.company_id',      $companyId)
            ->where('cd.party_id',        $partyId)
            ->where('cd.fiscal_year_id',  $fiscalYearId)
            ->where('cd.is_locked',       true)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date', '<=', $date)
            ->whereNull('cd.deleted_at')
            ->select(DB::raw("
                SUM(CASE WHEN dbo.name = 'sale'     THEN cd.net_to_pay ELSE 0 END)
                -
                SUM(CASE WHEN dbo.name = 'purchase' THEN cd.net_to_pay ELSE 0 END)
                as balance
            "))
            ->value('balance') ?? 0;

        // 3. Confirmed payments within fiscal year up to $date
        $paymentsTotal = DB::table('payments')
            ->where('company_id',     $companyId)
            ->where('party_id',       $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('status',         'confirmed')
            ->whereDate('payment_date', '<=', $date)
            ->whereNull('deleted_at')
            ->sum('amount');

        $currentBalance = round(
            $openingAmount + (float) $documentsBalance - (float) $paymentsTotal,
            4
        );

        return [
            'party_id'          => $partyId,
            'date'              => $date,
            'fiscal_year_id'    => $fiscalYearId,
            'opening_balance'   => round($openingAmount, 4),
            'documents_balance' => round((float) $documentsBalance, 4),
            'payments_total'    => round((float) $paymentsTotal, 4),
            'current_balance'   => $currentBalance,
            'balance_type'      => $currentBalance >= 0 ? 'debit' : 'credit',
        ];
    }

    /**
     * Balances for all parties at a given date.
     * Use for list/statement screens — never getCurrentBalanceAttribute()
     * inside collections (N+1).
     */
    public function getAllBalancesAt(string $date, ?int $partyTypeId = null, ?string $search = null): array
{
    $companyId = $this->companyContext->get();

    $partyQuery = DB::table('parties')
        ->where('company_id', $companyId)
        ->whereNull('deleted_at');

    if ($partyTypeId) {
        $partyQuery->where('party_type_id', $partyTypeId);
    }

    if ($search) {
        $partyQuery->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('commercial_name', 'like', "%{$search}%")
              ->orWhere('code', 'like', "%{$search}%")
              ->orWhere('nif', 'like', "%{$search}%");
        });
    }

    $parties = $partyQuery->select('id', 'name', 'party_type_id')->get();

    $balances = [];
    foreach ($parties as $party) {
        $balance = $this->getBalanceAt($party->id, $date);
        $balance['party'] = [
            'id'   => $party->id,
            'name' => $party->name,
            'party_type' => \App\Models\PartyType::find($party->party_type_id)?->only(['name']),
        ];
        $balances[] = $balance;
    }

    return $balances;
}
}

```

