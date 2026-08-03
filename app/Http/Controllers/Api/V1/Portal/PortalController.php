<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\Company;
use App\Models\Party;
use App\Models\PortalUser;
use App\Services\CompanyContextService;
use App\Services\PartyBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PortalController extends BaseApiController
{
    protected string $resourceName = 'portal';
    protected ?string $resourceClass = null;

    public function __construct(
        private PartyBalanceService $balanceService,
        private CompanyContextService $context,
    ) {
        parent::__construct();
    }

    /**
     * معلومات المؤسسة لصفحة الدخول — مسار عام (بدون مصادقة زبون)
     */
    public function companyInfo(Request $request): JsonResponse
    {
        try {
            $company = Company::query()->find($this->context->get());

            if (! $company || ! $company->active) {
                return $this->errorResponse('المؤسسة غير موجودة أو غير متاحة.', 404, 'COMPANY_NOT_FOUND');
            }

            return $this->successResponse($this->companyRow($company), 'تم جلب بيانات المؤسسة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.company_info');
        }
    }

    public function dashboard(Request $request): JsonResponse
    {
        try {
            $portal  = $this->portal($request);
            $partyId = (int) $portal->party_id;
            $date    = $this->asDate($request->input('date'));
            $monthStart = date('Y-m-01', strtotime($date));

            $party   = Party::query()->findOrFail($partyId);
            $company = Company::query()->find($portal->company_id);
            $balance = $this->balanceService->getBalanceAt($partyId, $date);

            $recentDocuments = $this->saleDocumentsQuery($partyId, $date)
                ->orderByDesc('cd.document_date')
                ->orderByDesc('cd.id')
                ->limit(5)
                ->get()
                ->map(fn ($d) => $this->documentRow($d))
                ->values();

            $recentPayments = $this->paymentsQuery($partyId, $date)
                ->orderByDesc('p.payment_date')
                ->orderByDesc('p.id')
                ->limit(5)
                ->get()
                ->map(fn ($p) => $this->paymentRow($p))
                ->values();

            $monthTotal = $this->saleDocumentsQuery($partyId, $date)
                ->whereDate('cd.document_date', '>=', $monthStart)
                ->selectRaw("COALESCE(SUM(CASE WHEN dt.code = 'AV' THEN -cd.net_to_pay ELSE cd.net_to_pay END), 0) as total")
                ->value('total') ?? 0;

            $unpaidTotal = $this->saleDocumentsQuery($partyId, $date)
                ->selectRaw('COALESCE(SUM(cd.remaining_amount), 0) as total')
                ->value('total') ?? 0;

            return $this->successResponse([
                'balance'          => $balance,
                'party'            => $this->partyRow($party),
                'company'          => $this->companyRow($company),
                'month'            => ['date' => $monthStart, 'sales_total' => round((float) $monthTotal, 2)],
                'unpaid_total'     => round((float) $unpaidTotal, 2),
                'recent_documents' => $recentDocuments,
                'recent_payments'  => $recentPayments,
            ], 'تم جلب بيانات اللوحة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.dashboard');
        }
    }

    public function documents(Request $request): JsonResponse
    {
        try {
            $portal  = $this->portal($request);
            $partyId = (int) $portal->party_id;
            $date    = $this->asDate($request->input('date'));

            $perPage = min((int) $request->input('per_page', 15), 100);
            $page    = max((int) $request->input('page', 1), 1);

            $paginator = $this->saleDocumentsQuery($partyId, $date)
                ->orderByDesc('cd.document_date')
                ->orderByDesc('cd.id')
                ->paginate($perPage, ['*'], 'page', $page);

            return $this->successResponse(
                $this->paginated($paginator->through(fn ($d) => $this->documentRow($d))),
                'تم جلب قائمة المستندات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.documents');
        }
    }

    public function showDocument(Request $request, $id): JsonResponse
    {
        try {
            $portal  = $this->portal($request);
            $partyId = (int) $portal->party_id;
            $date    = $this->asDate($request->input('date'));

            $doc = $this->saleDocumentsQuery($partyId, $date)
                ->where('cd.id', (int) $id)
                ->first();

            if (! $doc) {
                return $this->errorResponse('المستند غير موجود', 404, 'DOCUMENT_NOT_FOUND');
            }

            $companyId = (int) $this->context->get();
            $lines = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'cdl.product_id', '=', 'p.id')
                ->where('cdl.company_id', $companyId)
                ->where('cdl.commercial_document_id', $doc->id)
                ->orderBy('cdl.line_order')
                ->orderBy('cdl.id')
                ->select(
                    'cdl.id', 'cdl.product_id', 'p.name as product_name', 'p.ref',
                    'cdl.quantity', 'cdl.unit_price_ht', 'cdl.discount_percentage',
                    'cdl.total_discount_amount', 'cdl.tva_rate',
                    'cdl.total_ht', 'cdl.total_tva', 'cdl.total_ttc',
                    'cdl.packaging_units_snapshot'
                )
                ->get()
                ->map(fn ($l) => [
                    'id'                    => $l->id,
                    'product_id'            => $l->product_id,
                    'product_name'          => $l->product_name,
                    'ref'                   => $l->ref,
                    'quantity'              => (float) $l->quantity,
                    'unit_price_ht'         => (float) $l->unit_price_ht,
                    'discount_percentage'   => (float) $l->discount_percentage,
                    'total_discount_amount' => (float) $l->total_discount_amount,
                    'tva_rate'              => (float) $l->tva_rate,
                    'total_ht'              => (float) $l->total_ht,
                    'total_tva'             => (float) $l->total_tva,
                    'total_ttc'             => (float) $l->total_ttc,
                    'pack_qty'              => $l->packaging_units_snapshot ? (float) $l->packaging_units_snapshot : null,
                ])
                ->values();

            $payments = DB::table('document_payment as dp')
                ->join('payments as p', 'dp.payment_id', '=', 'p.id')
                ->join('payment_modes as pm', 'p.payment_mode_id', '=', 'pm.id')
                ->where('dp.company_id', $companyId)
                ->where('dp.commercial_document_id', $doc->id)
                ->whereNull('p.deleted_at')
                ->orderBy('p.payment_date')
                ->orderBy('p.id')
                ->select('p.id', 'p.payment_date', 'dp.amount_applied', 'pm.name as payment_mode', 'p.reference')
                ->get()
                ->map(fn ($p) => [
                    'id'            => $p->id,
                    'date'          => $p->payment_date,
                    'amount'        => (float) $p->amount_applied,
                    'payment_mode'  => $p->payment_mode,
                    'reference'     => $p->reference,
                ])
                ->values();

            return $this->successResponse([
                ...$this->documentRow($doc),
                'lines'   => $lines,
                'payments' => $payments,
            ], 'تم جلب تفاصيل المستند بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.document');
        }
    }

    public function payments(Request $request): JsonResponse
    {
        try {
            $portal  = $this->portal($request);
            $partyId = (int) $portal->party_id;
            $date    = $this->asDate($request->input('date'));

            $perPage = min((int) $request->input('per_page', 15), 100);
            $page    = max((int) $request->input('page', 1), 1);

            $paginator = $this->paymentsQuery($partyId, $date)
                ->orderByDesc('p.payment_date')
                ->orderByDesc('p.id')
                ->paginate($perPage, ['*'], 'page', $page);

            return $this->successResponse(
                $this->paginated($paginator->through(fn ($p) => $this->paymentRow($p))),
                'تم جلب قائمة الدفعات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.payments');
        }
    }

    public function statement(Request $request): JsonResponse
    {
        try {
            $portal  = $this->portal($request);
            $partyId = (int) $portal->party_id;
            $from    = $this->asDate($request->input('from'));
            $to      = $this->asDate($request->input('to', now()->toDateString()));
            $companyId = (int) $this->context->get();

            if ($from > $to) {
                [$from, $to] = [$to, $from];
            }

            $dayBefore = date('Y-m-d', strtotime($from . ' -1 day'));
            $opening   = $this->balanceService->getBalanceAt($partyId, $dayBefore);

            $rows = [];

            $documents = $this->saleDocumentsQuery($partyId, $to)
                ->whereDate('cd.document_date', '>=', $from)
                ->orderBy('cd.document_date')
                ->orderBy('cd.id')
                ->get();

            foreach ($documents as $doc) {
                $isCredit  = $doc->type_code === 'AV';
                $amount    = $isCredit ? -1 * (float) $doc->net_to_pay : (float) $doc->net_to_pay;
                $rows[] = [
                    'date'        => $doc->document_date,
                    'reference'   => $doc->document_number,
                    'type'        => $doc->type_code,
                    'label'       => $doc->type_name,
                    'debit'       => $isCredit ? 0 : round((float) $doc->net_to_pay, 2),
                    'credit'      => $isCredit ? round((float) $doc->net_to_pay, 2) : 0,
                    'balance'     => round((float) $doc->net_to_pay, 2),
                    'remaining'   => (float) $doc->remaining_amount,
                ];
            }

            $payments = $this->paymentsQuery($partyId, $to)
                ->whereDate('p.payment_date', '>=', $from)
                ->orderBy('p.payment_date')
                ->orderBy('p.id')
                ->get();

            foreach ($payments as $pay) {
                $isOut = $pay->direction === 'out';
                $rows[] = [
                    'date'        => $pay->payment_date,
                    'reference'   => $pay->reference ?: $pay->payment_number,
                    'type'        => 'PMT',
                    'label'       => 'دفعة - ' . $pay->payment_mode,
                    'debit'       => $isOut ? round((float) $pay->amount, 2) : 0,
                    'credit'      => $isOut ? 0 : round((float) $pay->amount, 2),
                    'balance'     => $isOut ? round((float) $pay->amount, 2) : round(-1 * (float) $pay->amount, 2),
                    'remaining'   => 0,
                ];
            }

            usort($rows, function (array $a, array $b): int {
                return [$a['date'], $a['type'] === 'PMT' ? 1 : 0] <=> [$b['date'], $b['type'] === 'PMT' ? 1 : 0];
            });

            $running = (float) $opening['current_balance'] ?? 0;
            foreach ($rows as &$row) {
                $running += (float) $row['balance'];
                $row['balance'] = round($running, 2);
            }
            unset($row);

            $totalDebit  = array_sum(array_column($rows, 'debit'));
            $totalCredit = array_sum(array_column($rows, 'credit'));

            return $this->successResponse([
                'opening'  => round((float) $opening['current_balance'], 2),
                'closing'  => round($running, 2),
                'total_debit'  => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
                'from'     => $from,
                'to'       => $to,
                'rows'     => $rows,
            ], 'تم جلب كشف الحساب بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal.statement');
        }
    }

    protected function saleDocumentsQuery(int $partyId, string $date)
    {
        return DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->leftJoin('document_statuses as ds', 'cd.document_status_id', '=', 'ds.id')
            ->where('cd.company_id', (int) $this->context->get())
            ->where('cd.party_id', $partyId)
            ->where('dbo.name', 'sale')
            ->whereDate('cd.document_date', '<=', $date)
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.id', 'cd.document_number', 'cd.document_date', 'cd.due_date',
                'cd.total_ht', 'cd.total_tva', 'cd.total_discount', 'cd.total_stamp',
                'cd.total_ttc', 'cd.net_to_pay', 'cd.paid_amount', 'cd.remaining_amount',
                'dt.code as type_code', 'dt.name as type_name',
                'ds.name as status_name',
                'dbo.name as operation'
            );
    }

    protected function paymentsQuery(int $partyId, string $date)
    {
        return DB::table('payments as p')
            ->join('payment_modes as pm', 'p.payment_mode_id', '=', 'pm.id')
            ->where('p.company_id', (int) $this->context->get())
            ->where('p.party_id', $partyId)
            ->where('p.status', 'confirmed')
            ->whereNull('p.deleted_at')
            ->whereDate('p.payment_date', '<=', $date)
            ->addSelect(
                'p.id', 'p.payment_number', 'p.payment_date', 'p.amount',
                'p.reference', 'p.notes',
                'pm.name as payment_mode', 'pm.code as payment_mode_code', 'pm.is_cash'
            )
            ->addSelect(DB::raw("CASE WHEN EXISTS (
                SELECT 1 FROM document_payment dp2
                JOIN commercial_documents pd2 ON pd2.id = dp2.commercial_document_id
                JOIN document_types pdt2 ON pdt2.id = pd2.document_type_id
                JOIN document_base_operations pdbo2 ON pdt2.document_base_operation_id = pdbo2.id
                WHERE dp2.payment_id = p.id AND pdbo2.name = 'purchase' AND pd2.deleted_at IS NULL
            ) THEN 'out' ELSE 'in' END AS direction"))
            ->distinct();
    }

    protected function documentRow($d): array
    {
        return [
            'id'              => (int) $d->id,
            'document_number' => $d->document_number,
            'document_date'   => $d->document_date,
            'due_date'        => $d->due_date,
            'type_code'       => $d->type_code,
            'type_name'       => $d->type_name,
            'status_name'     => $d->status_name,
            'total_ht'        => (float) $d->total_ht,
            'total_tva'       => (float) $d->total_tva,
            'total_discount'  => (float) $d->total_discount,
            'total_stamp'     => (float) $d->total_stamp,
            'total_ttc'       => (float) $d->total_ttc,
            'net_to_pay'      => (float) $d->net_to_pay,
            'paid_amount'     => (float) $d->paid_amount,
            'remaining_amount' => (float) $d->remaining_amount,
        ];
    }

    protected function paymentRow($p): array
    {
        return [
            'id'            => (int) $p->id,
            'payment_number' => $p->payment_number,
            'payment_date'  => $p->payment_date,
            'amount'        => (float) $p->amount,
            'payment_mode'  => $p->payment_mode,
            'payment_mode_code' => $p->payment_mode_code,
            'is_cash'       => (bool) $p->is_cash,
            'reference'     => $p->reference,
            'notes'         => $p->notes,
            'direction'     => $p->direction,
        ];
    }

    protected function partyRow(Party $party): array
    {
        return [
            'id'           => $party->id,
            'name'         => $party->name,
            'code'         => $party->code,
            'nif'          => $party->nif,
            'phone'        => $party->phone,
            'email'        => $party->email,
            'address'      => $party->address,
            'credit_limit' => (float) $party->credit_limit,
            'credit_days'  => $party->credit_days,
        ];
    }

    protected function companyRow(?Company $company): array
    {
        return $company ? [
            'id'              => $company->id,
            'name'            => $company->name,
            'commercial_name' => $company->commercial_name,
            'slug'            => $company->slug,
            'nif'             => $company->nif,
            'phone'           => $company->phone,
            'email'           => $company->email,
            'address'         => $company->address,
            'avatar'          => $company->avatar,
        ] : null;
    }

    protected function paginated(\Illuminate\Contracts\Pagination\LengthAwarePaginator $paginator): array
    {
        return [
            'data'       => $paginator->items(),
            'meta'       => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
            'links'      => [
                'first' => $paginator->url(1),
                'last'  => $paginator->url($paginator->lastPage()),
                'next'  => $paginator->nextPageUrl(),
                'prev'  => $paginator->previousPageUrl(),
            ],
        ];
    }

    protected function portal(Request $request): PortalUser
    {
        return $request->input('_portal_user');
    }

    protected function asDate(mixed $value): string
    {
        return $value ? substr((string) $value, 0, 10) : now()->toDateString();
    }

    protected function getService(): mixed
    {
        return null;
    }

    protected function getModelClass(): string
    {
        return PortalUser::class;
    }
}
