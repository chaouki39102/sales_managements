# Module Export: PartyBalance
Generated at: 2026-06-17 10:45:36

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
        $companyId = $this->companyContext->get();
        $date      = substr($date, 0, 10);

        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        // 1. Opening balance
        $opening = OpeningBalanceParty::query()
            ->where('company_id',     $companyId)
            ->where('party_id',       $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->first();

        $openingAmount = $opening?->signedAmount() ?? 0.0;

        // 2. Documents balance
        // ── منطق الإشارة ──────────────────────────────────────────────────────
        // مبيعات  (sale)     → + : الزبون مدين لنا  (يجب أن يدفع)
        // مشتريات (purchase) → - : نحن مدينون للمورد (يجب أن ندفع)
        // ──────────────────────────────────────────────────────────────────────
        $documentsBalance = (float) (DB::table('commercial_documents as cd')
            ->join('document_types as dt',           'cd.document_type_id',           '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id',         $companyId)
            ->where('cd.party_id',           $partyId)
            ->where('cd.fiscal_year_id',     $fiscalYearId)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date',  '<=', $date)
            ->whereNull('cd.deleted_at')
            ->selectRaw("
                COALESCE(SUM(CASE WHEN dbo.name = 'sale'     THEN cd.net_to_pay ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN dbo.name = 'purchase' THEN cd.net_to_pay ELSE 0 END), 0)
                as balance
            ")
            ->value('balance') ?? 0);

        // 3. Payments
        // الدفعات تُقلّل الرصيد دائماً (سواء دفع الزبون أو دفعنا للمورد)
        $paymentsTotal = (float) (DB::table('payments')
            ->where('company_id',     $companyId)
            ->where('party_id',       $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('status',         'confirmed')
            ->whereDate('payment_date', '<=', $date)
            ->whereNull('deleted_at')
            ->sum('amount') ?? 0);

        $currentBalance = round(
            $openingAmount + $documentsBalance - $paymentsTotal,
            4
        );

        // ── منطق balance_type ─────────────────────────────────────────────────
        // نستخدم القيمة المطلقة للعرض وnbalance_type لتحديد الاتجاه:
        //
        // currentBalance > 0 → الطرف مدين لنا   (debit)  = زبون لم يدفع
        // currentBalance < 0 → نحن مدينون له    (credit) = مورد لم ندفع له
        //
        // لكن من منظور المستخدم:
        //   الزبون المدين   = "مدين (علينا)"  ← خطأ لغوي في الـ UI، الصحيح: "مدين لنا"
        //   المورد الدائن   = "نحن مدينون له" ← يُعرض كـ credit
        //
        // نُرجع current_balance بإشارته الأصلية لأغراض الحسابات
        // ونُرجع display_balance (القيمة المطلقة) للعرض
        // ──────────────────────────────────────────────────────────────────────
        return [
            'party_id'          => $partyId,
            'date'              => $date,
            'fiscal_year_id'    => $fiscalYearId,
            'opening_balance'   => round($openingAmount,   4),
            'documents_balance' => round($documentsBalance, 4),
            'payments_total'    => round($paymentsTotal,    4),
            'current_balance'   => abs($currentBalance),        // ✅ قيمة موجبة دائماً للعرض
            'signed_balance'    => $currentBalance,             // ✅ للحسابات الداخلية
            'balance_type'      => $currentBalance >= 0 ? 'debit' : 'credit',
        ];
    }

    public function getAllBalancesAt(string $date, ?int $partyTypeId = null, ?string $search = null): array
    {
        $date      = substr($date, 0, 10);
        $companyId = $this->companyContext->get();

        $partyQuery = DB::table('parties as p')
            ->join('party_types as pt', 'p.party_type_id', '=', 'pt.id')
            ->where('p.company_id', $companyId)
            ->whereNull('p.deleted_at');

        if ($partyTypeId) {
            $partyQuery->where('p.party_type_id', $partyTypeId);
        }

        if ($search) {
            $partyQuery->where(function ($q) use ($search) {
                $q->where('p.name',             'like', "%{$search}%")
                  ->orWhere('p.commercial_name', 'like', "%{$search}%")
                  ->orWhere('p.code',            'like', "%{$search}%")
                  ->orWhere('p.nif',             'like', "%{$search}%");
            });
        }

        $parties = $partyQuery
            ->select('p.id', 'p.name', 'p.party_type_id', 'pt.name as party_type_name')
            ->get();

        $balances = [];
        foreach ($parties as $party) {
            $balance          = $this->getBalanceAt($party->id, $date);
            $balance['party'] = [
                'id'            => $party->id,
                'name'          => $party->name,
                'party_type_id' => $party->party_type_id,
                'party_type'    => ['name' => $party->party_type_name],
            ];
            $balances[] = $balance;
        }

        return $balances;
    }
}

```

