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
                COALESCE(SUM(CASE WHEN dbo.name = 'sale'     THEN CASE WHEN dt.code = 'AV' THEN -cd.net_to_pay ELSE cd.net_to_pay END ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN dbo.name = 'purchase' THEN CASE WHEN dt.code = 'AA' THEN -cd.net_to_pay ELSE cd.net_to_pay END ELSE 0 END), 0)
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
            2
        );

        // ── current_balance يُحافِظ على إشارته المالية ─────────────────────────
        // > 0 → الطرف مدين لنا (زبون لم يدفع)
        // < 0 → نحن مدينون للطرف (سلفة / رصيد دائن)
        // = 0 → لا يوجد رصيد
        // ──────────────────────────────────────────────────────────────────────
        return [
            'party_id'          => $partyId,
            'date'              => $date,
            'fiscal_year_id'    => $fiscalYearId,
            'opening_balance'   => round($openingAmount,   4),
            'documents_balance' => round($documentsBalance, 4),
            'payments_total'    => round($paymentsTotal,    4),
            'current_balance'   => $currentBalance,             // ✅ إشارة محفوظة (ليس abs)
            'signed_balance'    => $currentBalance,
            'balance_type'      => $currentBalance >= 0 ? 'debit' : 'credit',
        ];
    }

    public function getAllBalancesAt(string $date, ?int $partyTypeId = null, ?string $search = null): array
    {
        $date          = substr($date, 0, 10);
        $companyId     = $this->companyContext->get();
        $fiscalYearId  = $this->resolveFiscalYearId($companyId, $date);

        // 1. Parties
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

        if ($parties->isEmpty()) {
            return [];
        }

        $partyIds = $parties->pluck('id');

        // 2. Opening balances (batch)
        $openingMap = DB::table('opening_balances_parties')
            ->where('company_id',     $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->whereIn('party_id',     $partyIds)
            ->selectRaw("party_id, COALESCE(SUM(CASE WHEN balance_type = 'debit' THEN opening_balance ELSE -opening_balance END), 0) as total")
            ->groupBy('party_id')
            ->pluck('total', 'party_id');

        // 3. Documents balance (batch)
        $documentsMap = DB::table('commercial_documents as cd')
            ->join('document_types as dt',            'cd.document_type_id',         '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id',          $companyId)
            ->where('cd.fiscal_year_id',      $fiscalYearId)
            ->whereIn('cd.party_id',          $partyIds)
            ->where('dt.affects_accounting',  true)
            ->whereDate('cd.document_date',   '<=', $date)
            ->whereNull('cd.deleted_at')
            ->selectRaw("
                cd.party_id,
                COALESCE(SUM(CASE WHEN dbo.name = 'sale'     THEN CASE WHEN dt.code = 'AV' THEN -cd.net_to_pay ELSE cd.net_to_pay END ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN dbo.name = 'purchase' THEN CASE WHEN dt.code = 'AA' THEN -cd.net_to_pay ELSE cd.net_to_pay END ELSE 0 END), 0)
                as total
            ")
            ->groupBy('cd.party_id')
            ->pluck('total', 'party_id');

        // 4. Payments (batch)
        $paymentsMap = DB::table('payments')
            ->where('company_id',     $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->whereIn('party_id',     $partyIds)
            ->where('status',         'confirmed')
            ->whereDate('payment_date', '<=', $date)
            ->whereNull('deleted_at')
            ->selectRaw('party_id, COALESCE(SUM(amount), 0) as total')
            ->groupBy('party_id')
            ->pluck('total', 'party_id');

        // 5. Merge
        $balances = [];
        foreach ($parties as $party) {
            $opening   = (float) ($openingMap[$party->id]   ?? 0);
            $documents = (float) ($documentsMap[$party->id] ?? 0);
            $payments  = (float) ($paymentsMap[$party->id]  ?? 0);
            $current   = round($opening + $documents - $payments, 4);

            $balances[] = [
                'party_id'          => $party->id,
                'date'              => $date,
                'fiscal_year_id'    => $fiscalYearId,
                'opening_balance'   => round($opening,   4),
                'documents_balance' => round($documents, 4),
                'payments_total'    => round($payments,  4),
                'current_balance'   => $current,             // ✅ إشارة محفوظة (ليس abs)
                'signed_balance'    => $current,
                'balance_type'      => $current >= 0 ? 'debit' : 'credit',
                'party' => [
                    'id'            => $party->id,
                    'name'          => $party->name,
                    'party_type_id' => $party->party_type_id,
                    'party_type'    => ['name' => $party->party_type_name],
                ],
            ];
        }

        return $balances;
    }

    /**
     * جلب سجل المعاملات (المستندات + الدفعات) لطرف محدد حتى تاريخ معين
     */
    public function getHistory(int $partyId, string $date): array
    {
        $companyId    = $this->companyContext->get();
        $date         = substr($date, 0, 10);
        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        // 0. الرصيد الافتتاحي
        $opening = OpeningBalanceParty::query()
            ->where('company_id', $companyId)
            ->where('party_id', $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->first();

        $openingAmount = $opening?->signedAmount() ?? 0.0;

        // 1. المستندات
        $documents = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id', $companyId)
            ->where('cd.party_id', $partyId)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date', '<=', $date)
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.id',
                'cd.document_number',
                'cd.document_date',
                'cd.net_to_pay',
                'cd.paid_amount',
                'cd.remaining_amount',
                'cd.created_at',
                'dt.name as type_name',
                'dt.code as type_code',
                'dbo.name as operation'
            )
            ->orderBy('cd.document_date', 'asc')
            ->orderBy('cd.id', 'asc')
            ->get()
            ->map(fn ($doc) => [
                'type'            => 'document',
                'id'              => $doc->id,
                'date'            => $doc->document_date,
                'datetime'        => $doc->created_at,
                'reference'       => $doc->document_number,
                'label'           => $doc->type_name,
                'type_code'       => $doc->type_code,
                'document_amount' => ($doc->operation === 'sale')
                    ? ($doc->type_code === 'AV' ? -round((float) $doc->net_to_pay, 2) : round((float) $doc->net_to_pay, 2))
                    : ($doc->type_code === 'AA' ? round((float) $doc->net_to_pay, 2) : -round((float) $doc->net_to_pay, 2)),
                'payment_amount'  => 0,
                'remaining'       => round((float) $doc->remaining_amount, 2),
            ]);

        // 2. تكلفة المستندات (from line-level cost_price_ht — sale only)
        $docIds = $documents->pluck('id');
        $costMap = [];
        if ($docIds->isNotEmpty()) {
            $costRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
                ->where('dt.document_base_operation_id', 1) // sale only
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->whereNull('cd.deleted_at')
                ->select(
                    'cdl.commercial_document_id',
                    DB::raw('SUM(CASE WHEN dt.code = \'AV\' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as doc_cost_ht')
                )
                ->groupBy('cdl.commercial_document_id')
                ->get()
                ->keyBy('commercial_document_id');

            foreach ($costRows as $cr) {
                $costMap[$cr->commercial_document_id] = (float) $cr->doc_cost_ht;
            }
        }

        // Attach cost + margin to documents
        $documents = $documents->map(function ($doc) use ($costMap) {
            $docCost = $costMap[$doc['id']] ?? 0;
            $doc['doc_cost_ht'] = round($docCost, 2);
            $doc['margin_value'] = round($doc['document_amount'] - $docCost, 2);
            return $doc;
        });

        // 3. الدفعات
        $payments = DB::table('payments')
            ->leftJoin('payment_modes as pm', 'payments.payment_mode_id', '=', 'pm.id')
            ->where('payments.company_id', $companyId)
            ->where('payments.party_id', $partyId)
            ->where('payments.status', 'confirmed')
            ->whereDate('payments.payment_date', '<=', $date)
            ->whereNull('payments.deleted_at')
            ->select(
                'payments.id',
                'payments.payment_number',
                'payments.payment_date',
                'payments.amount',
                'payments.direction',
                'payments.created_at',
                'pm.name as mode_name'
            )
            ->orderBy('payments.payment_date', 'asc')
            ->orderBy('payments.id', 'asc')
            ->get()
            ->map(fn ($p) => [
                'type'            => 'payment',
                'id'              => $p->id,
                'date'            => $p->payment_date,
                'datetime'        => $p->created_at,
                'reference'       => $p->payment_number,
                'label'           => $p->mode_name ?: 'دفعة',
                'type_code'       => null,
                'document_amount' => 0,
                'payment_amount'  => round((float) $p->amount, 2),
                'remaining'       => 0,
                'doc_cost_ht'     => 0,
                'margin_value'    => 0,
            ]);

        // 4. الدمج وترتيب بالتاريخ ثم الرقم
        $all = $documents->merge($payments)->values()->all();
        usort($all, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) return $cmp;
            $cmp = strcmp($a['datetime'] ?? '', $b['datetime'] ?? '');
            if ($cmp !== 0) return $cmp;
            if ($a['type'] !== $b['type']) return $a['type'] === 'document' ? -1 : 1;
            return $a['id'] - $b['id'];
        });
        foreach ($all as $i => &$item) {
            $item['seq'] = $i + 1;
        }
        unset($item);

        return [
            'opening_balance' => round($openingAmount, 2),
            'transactions'    => $all,
        ];
    }

    /**
     * ملخص المنتجات التي تعاملت معها الجهة حتى تاريخ معين
     */
    public function getProductRecap(int $partyId, string $date): array
    {
        $companyId    = $this->companyContext->get();
        $date         = substr($date, 0, 10);
        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        $lines = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->join('products as p', 'p.id', '=', 'cdl.product_id')
            ->leftJoin('units as u', 'u.id', '=', 'p.unit_id')
            ->leftJoin('brands as br', 'br.id', '=', 'p.brand_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->where('cd.company_id', $companyId)
            ->where('cd.party_id', $partyId)
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date', '<=', $date)
            ->whereNull('cd.deleted_at')
            ->select(
                'p.id as product_id',
                'p.name as product_name',
                'p.ref as product_ref',
                'u.name as unit_name',
                'br.name as brand_name',
                'f.name as family_name',
                'dbo.name as operation',
                DB::raw('SUM(CASE WHEN dbo.name = \'sale\' THEN CASE WHEN dt.code = \'AV\' THEN -cdl.quantity ELSE cdl.quantity END WHEN dbo.name = \'purchase\' THEN CASE WHEN dt.code = \'AA\' THEN -cdl.quantity ELSE cdl.quantity END ELSE 0 END) as total_quantity'),
                DB::raw('SUM(CASE WHEN dbo.name = \'sale\' THEN CASE WHEN dt.code = \'AV\' THEN -cdl.total_ht ELSE cdl.total_ht END WHEN dbo.name = \'purchase\' THEN CASE WHEN dt.code = \'AA\' THEN -cdl.total_ht ELSE cdl.total_ht END ELSE 0 END) as total_ht'),
                DB::raw('SUM(CASE WHEN dbo.name = \'sale\' THEN CASE WHEN dt.code = \'AV\' THEN -cdl.total_ttc ELSE cdl.total_ttc END WHEN dbo.name = \'purchase\' THEN CASE WHEN dt.code = \'AA\' THEN -cdl.total_ttc ELSE cdl.total_ttc END ELSE 0 END) as total_ttc'),
                DB::raw('SUM(cdl.total_tva) as total_tva'),
                DB::raw('SUM(cdl.discount_amount) as total_discount'),
                DB::raw('COUNT(DISTINCT cd.id) as doc_count')
            )
            ->groupBy('p.id', 'p.name', 'p.ref', 'u.name', 'br.name', 'f.name', 'dbo.name')
            ->orderBy('p.name', 'asc')
            ->get();

        // تجميع: نفس المنتج قد يكون في مبيعات ومشتريات
        $productMap = [];
        foreach ($lines as $line) {
            $pid = $line->product_id;
            if (!isset($productMap[$pid])) {
                $productMap[$pid] = [
                    'product_id'   => $pid,
                    'product_name' => $line->product_name,
                    'product_ref'  => $line->product_ref,
                    'unit_name'    => $line->unit_name,
                    'brand_name'   => $line->brand_name,
                    'family_name'  => $line->family_name,
                    'sale_qty'     => 0.0,
                    'sale_ht'      => 0.0,
                    'sale_ttc'     => 0.0,
                    'purchase_qty' => 0.0,
                    'purchase_ht'  => 0.0,
                    'purchase_ttc' => 0.0,
                    'total_qty'    => 0.0,
                    'total_ht'     => 0.0,
                    'total_ttc'    => 0.0,
                    'total_tva'    => 0.0,
                    'total_discount' => 0.0,
                    'doc_count'    => 0,
                ];
            }
            $p = &$productMap[$pid];
            if ($line->operation === 'sale') {
                $p['sale_qty'] += (float) $line->total_quantity;
                $p['sale_ht']  += (float) $line->total_ht;
                $p['sale_ttc'] += (float) $line->total_ttc;
            } else {
                $p['purchase_qty'] += (float) $line->total_quantity;
                $p['purchase_ht']  += (float) $line->total_ht;
                $p['purchase_ttc'] += (float) $line->total_ttc;
            }
            $p['total_qty']      += (float) $line->total_quantity;
            $p['total_ht']       += (float) $line->total_ht;
            $p['total_ttc']      += (float) $line->total_ttc;
            $p['total_tva']      += (float) $line->total_tva;
            $p['total_discount'] += (float) $line->total_discount;
            $p['doc_count']      += (int) $line->doc_count;
            unset($p);
        }

        $products = array_values($productMap);

        $productIds = array_column($products, 'product_id');

        // Compute cost from line-level cost_price_ht (stored at document creation time)
        foreach ($products as &$p) {
            $p['effective_cost_price'] = 0;
            $p['cost_ht'] = 0;
            $p['margin_value'] = 0;
            $p['margin_pct'] = 0;
        }
        unset($p);

        if (!empty($productIds)) {
            $costLines = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
                ->where('cd.company_id', $companyId)
                ->where('cd.party_id', $partyId)
                ->where('cd.fiscal_year_id', $fiscalYearId)
                ->where('dt.affects_accounting', true)
                ->whereDate('cd.document_date', '<=', $date)
                ->whereNull('cd.deleted_at')
                ->where('dt.document_base_operation_id', 1) // sale only
                ->where('cdl.cost_price_ht', '>', 0)
                ->select(
                    'cdl.product_id',
                    DB::raw('SUM(CASE WHEN dt.code = \'AV\' THEN -cdl.quantity ELSE cdl.quantity END) as sale_qty'),
                    DB::raw('SUM(CASE WHEN dt.code = \'AV\' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as cost_ht')
                )
                ->groupBy('cdl.product_id')
                ->get()
                ->keyBy('product_id');

            $costMap = [];
            foreach ($costLines as $cl) {
                $costMap[$cl->product_id] = [
                    'sale_qty' => (float) $cl->sale_qty,
                    'cost_ht'  => (float) $cl->cost_ht,
                ];
            }

            foreach ($products as &$p) {
                if (isset($costMap[$p['product_id']]) && $costMap[$p['product_id']]['sale_qty'] > 0) {
                    $effectiveCost = $costMap[$p['product_id']]['cost_ht'] / $costMap[$p['product_id']]['sale_qty'];
                    $p['effective_cost_price'] = round($effectiveCost, 4);
                } else {
                    $effectiveCost = 0;
                }
                $p['cost_ht'] = round($p['sale_qty'] * $effectiveCost, 4);
                $p['margin_value'] = round($p['sale_ht'] - $p['cost_ht'], 4);
                $p['margin_pct'] = $p['sale_ht'] > 0
                    ? round(($p['margin_value'] / $p['sale_ht']) * 100, 2)
                    : 0;
            }
            unset($p);
        }

        $summary = [
            'product_count'      => count($products),
            'total_sale_ht'      => round(array_sum(array_column($products, 'sale_ht')), 2),
            'total_sale_ttc'     => round(array_sum(array_column($products, 'sale_ttc')), 2),
            'total_purchase_ht'  => round(array_sum(array_column($products, 'purchase_ht')), 2),
            'total_purchase_ttc' => round(array_sum(array_column($products, 'purchase_ttc')), 2),
            'total_cost_ht'      => round(array_sum(array_column($products, 'cost_ht')), 2),
            'total_margin_value' => round(array_sum(array_column($products, 'margin_value')), 2),
            'total_margin_pct'   => 0,
        ];
        $summary['total_margin_pct'] = $summary['total_sale_ht'] > 0
            ? round(($summary['total_margin_value'] / $summary['total_sale_ht']) * 100, 2)
            : 0;

        return [
            'products' => $products,
            'summary'  => $summary,
        ];
    }

    /**
     * سجل المعاملات التفصيلي مع بنود كل مستند
     */
    public function getDetailedHistory(int $partyId, string $date): array
    {
        $companyId    = $this->companyContext->get();
        $date         = substr($date, 0, 10);
        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        // 0. الرصيد الافتتاحي
        $opening = OpeningBalanceParty::query()
            ->where('company_id', $companyId)
            ->where('party_id', $partyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->first();

        $openingAmount = $opening?->signedAmount() ?? 0.0;

        // 1. المستندات مع بنودها
        $documents = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id', $companyId)
            ->where('cd.party_id', $partyId)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date', '<=', $date)
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.id',
                'cd.document_number',
                'cd.document_date',
                'cd.net_to_pay',
                'cd.paid_amount',
                'cd.remaining_amount',
                'cd.created_at',
                'dt.name as type_name',
                'dt.code as type_code',
                'dbo.name as operation'
            )
            ->orderBy('cd.document_date', 'asc')
            ->orderBy('cd.id', 'asc')
            ->get();

        // 2. بنود المستندات
        $docIds = $documents->pluck('id');
        $docTypeMap = $documents->pluck('type_code', 'id')->toArray();
        $linesMap = [];
        $docCostMap = [];
        if ($docIds->isNotEmpty()) {
            $lines = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->leftJoin('units as u', 'u.id', '=', 'p.unit_id')
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    'u.name as unit_name',
                    'cdl.quantity',
                    'cdl.unit_price_ht',
                    'cdl.discount_percentage',
                    'cdl.total_ht',
                    'cdl.total_tva',
                    'cdl.total_ttc',
                    'cdl.tva_rate',
                    'cdl.cost_price_ht'
                )
                ->orderBy('cdl.line_order', 'asc')
                ->get();

            foreach ($lines as $line) {
                $docId = $line->commercial_document_id;
                if (!isset($linesMap[$docId])) {
                    $linesMap[$docId] = [];
                    $docCostMap[$docId] = 0;
                }
                $qty = (float) $line->quantity;
                $cost = (float) $line->cost_price_ht;
                $isReturn = ($docTypeMap[$docId] ?? '') === 'AV';
                $sign = $isReturn ? -1 : 1;
                $lineCost = $sign * $qty * $cost;
                $docCostMap[$docId] += $lineCost;

                $linesMap[$docId][] = [
                    'product_name'    => $line->product_name,
                    'product_ref'     => $line->product_ref,
                    'unit_name'       => $line->unit_name,
                    'quantity'        => round($qty, 3),
                    'unit_price_ht'   => round((float) $line->unit_price_ht, 4),
                    'discount_pct'    => round((float) $line->discount_percentage, 2),
                    'total_ht'        => round((float) $line->total_ht, 2),
                    'total_tva'       => round((float) $line->total_tva, 2),
                    'total_ttc'       => round((float) $line->total_ttc, 2),
                    'tva_rate'        => round((float) $line->tva_rate, 2),
                    'cost_price_ht'   => round($cost, 4),
                    'line_cost_ht'    => round($lineCost, 2),
                    'line_margin'     => round($sign * (float) $line->total_ht - $lineCost, 2),
                ];
            }
        }

        $documents = $documents->map(fn ($doc) => [
            'type'            => 'document',
            'id'              => $doc->id,
            'date'            => $doc->document_date,
            'datetime'        => $doc->created_at,
            'reference'       => $doc->document_number,
            'label'           => $doc->type_name,
            'type_code'       => $doc->type_code,
            'document_amount' => ($doc->operation === 'sale')
                ? ($doc->type_code === 'AV' ? -round((float) $doc->net_to_pay, 2) : round((float) $doc->net_to_pay, 2))
                : ($doc->type_code === 'AA' ? round((float) $doc->net_to_pay, 2) : -round((float) $doc->net_to_pay, 2)),
            'payment_amount'  => 0,
            'remaining'       => round((float) $doc->remaining_amount, 2),
            'doc_cost_ht'     => round($docCostMap[$doc->id] ?? 0, 2),
            'margin_value'    => round(
                (($doc->operation === 'sale')
                    ? ($doc->type_code === 'AV' ? -(float) $doc->net_to_pay : (float) $doc->net_to_pay)
                    : ($doc->type_code === 'AA' ? (float) $doc->net_to_pay : -(float) $doc->net_to_pay))
                - ($docCostMap[$doc->id] ?? 0), 2
            ),
            'lines'           => $linesMap[$doc->id] ?? [],
        ]);

        // 3. الدفعات
        $payments = DB::table('payments')
            ->leftJoin('payment_modes as pm', 'payments.payment_mode_id', '=', 'pm.id')
            ->where('payments.company_id', $companyId)
            ->where('payments.party_id', $partyId)
            ->where('payments.status', 'confirmed')
            ->whereDate('payments.payment_date', '<=', $date)
            ->whereNull('payments.deleted_at')
            ->select(
                'payments.id',
                'payments.payment_number',
                'payments.payment_date',
                'payments.amount',
                'payments.direction',
                'payments.created_at',
                'pm.name as mode_name'
            )
            ->orderBy('payments.payment_date', 'asc')
            ->orderBy('payments.id', 'asc')
            ->get()
            ->map(fn ($p) => [
                'type'            => 'payment',
                'id'              => $p->id,
                'date'            => $p->payment_date,
                'datetime'        => $p->created_at,
                'reference'       => $p->payment_number,
                'label'           => $p->mode_name ?: 'دفعة',
                'type_code'       => null,
                'document_amount' => 0,
                'payment_amount'  => round((float) $p->amount, 2),
                'remaining'       => 0,
                'doc_cost_ht'     => 0,
                'margin_value'    => 0,
                'lines'           => [],
            ]);

        // 4. الدمج والترتيب
        $all = $documents->merge($payments)->values()->all();
        usort($all, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) return $cmp;
            $cmp = strcmp($a['datetime'] ?? '', $b['datetime'] ?? '');
            if ($cmp !== 0) return $cmp;
            if ($a['type'] !== $b['type']) return $a['type'] === 'document' ? -1 : 1;
            return $a['id'] - $b['id'];
        });
        foreach ($all as $i => &$item) {
            $item['seq'] = $i + 1;
        }
        unset($item);

        return [
            'opening_balance' => round($openingAmount, 2),
            'transactions'    => $all,
        ];
    }
}
