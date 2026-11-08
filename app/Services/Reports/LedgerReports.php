<?php

namespace App\Services\Reports;

use App\Services\PartyBalanceService;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Grand livre (general ledger per party) report.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class LedgerReports
{
    use ReportQueryHelpers;

    /**
     * ط¯ظپطھط± ط§ظ„ط£ط³طھط§ط° ط§ظ„ط¹ط§ظ… (Grand Livre): ط³ط¬ظ„ ط²ظ…ظ†ظٹ ظ„ظƒظ„ ط§ظ„ط­ط±ظƒط§طھ (ظˆط«ط§ط¦ظ‚ + ط¯ظپط¹ط§طھ)
     * ظ„ظƒظ„ ط·ط±ظپ ظپظٹ ط§ظ„ظپطھط±ط©طŒ ظ…ط¹ ط§ظ„ط±طµظٹط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹ ظ‚ط¨ظ„ ط¨ط¯ط§ظٹط© ط§ظ„ظپطھط±ط© ظˆط§ظ„ط±طµظٹط¯ ط§ظ„ط¬ط§ط±ظٹ.
     * debit = ظ…ط§ ظ‡ظˆ ظ…ط³طھط­ظ‚ ظ„ظ†ط§ / credit = ظ…ط§ ظ‡ظˆ ظ…ط³طھط­ظ‚ ظ…ظ†ط§.
     */
    public function grandLivreReport(array $filters = []): array
    {
        $companyId    = $this->companyId();
        $partyId      = $filters['party_id'] ?? null;
        $partyTypeId  = $filters['party_type_id'] ?? null;
        $fromDate     = $filters['from_date'] ?? null;
        $toDate       = $filters['to_date'] ?? null;

        $empty = [
            'parties' => [],
            'summary' => [
                'party_count'      => 0,
                'transaction_count'=> 0,
                'total_debit'      => 0.0,
                'total_credit'     => 0.0,
                'net'              => 0.0,
            ],
        ];

        if (!$fromDate || !$toDate) {
            return $empty;
        }

        $from = Carbon::parse($fromDate)->toDateString();
        $to   = Carbon::parse($toDate)->toDateString();

        // 1. ظ†ط·ط§ظ‚ ط§ظ„ط£ط·ط±ط§ظپ
        $partyQuery = DB::table('parties as pt')
            ->where('pt.company_id', $companyId)
            ->whereNull('pt.deleted_at')
            ->select('pt.id', 'pt.name', 'pt.code', 'pt.party_type_id');
        if ($partyId)     $partyQuery->where('pt.id', $partyId);
        if ($partyTypeId) $partyQuery->where('pt.party_type_id', $partyTypeId);

        $parties  = $partyQuery->get();
        $partyIds = $parties->pluck('id');
        if ($partyIds->isEmpty()) {
            return $empty;
        }

        // 2. ط§ظ„ط±طµظٹط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹ ظ„ظƒظ„ ط·ط±ظپ ظ‚ط¨ظ„ ط¨ط¯ط§ظٹط© ط§ظ„ظپطھط±ط© (ظ†ظپط³ SSOT ط§ظ„ط®ط§طµ ط¨ط§ظ„ط±طµظٹط¯)
        $balanceService = app(PartyBalanceService::class);
        $openingMap     = [];
        $beforeDate     = Carbon::parse($from)->subDay()->toDateString();
        foreach ($balanceService->getAllBalancesAt($beforeDate, $partyTypeId) as $ob) {
            $openingMap[$ob['party_id']] = (float) $ob['current_balance'];
        }

        // 3. ط§ظ„ظˆط«ط§ط¦ظ‚
        $documents = DB::table('commercial_documents as cd')
            ->join('document_types as dt',             'cd.document_type_id',           '=', 'dt.id')
            ->join('document_base_operations as dbo',  'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id',         $companyId)
            ->whereIn('cd.party_id',         $partyIds)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date',  '>=', $from)
            ->whereDate('cd.document_date',  '<=', $to)
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.id',
                'cd.party_id',
                'cd.document_number',
                'cd.document_date',
                'cd.net_to_pay',
                'cd.created_at',
                'dt.name as type_name',
                'dt.code as type_code',
                'dbo.name as operation'
            )
            ->get();

        // 4. ط§ظ„ط¯ظپط¹ط§طھ
        $payments = DB::table('payments')
            ->leftJoin('payment_modes as pm', 'payments.payment_mode_id', '=', 'pm.id')
            ->where('payments.company_id',   $companyId)
            ->whereIn('payments.party_id',   $partyIds)
            ->where('payments.status',       'confirmed')
            ->whereDate('payments.payment_date', '>=', $from)
            ->whereDate('payments.payment_date', '<=', $to)
            ->whereNull('payments.deleted_at')
            ->select(
                'payments.id',
                'payments.party_id',
                'payments.payment_number',
                'payments.payment_date',
                'payments.amount',
                'payments.direction',
                'payments.created_at',
                'pm.name as mode_name'
            )
            ->get();

        // 5. طھط¬ظ…ظٹط¹ ط§ظ„ط­ط±ظƒط§طھ ظ„ظƒظ„ ط·ط±ظپ
        $txByParty = [];
        foreach ($documents as $doc) {
            [$debit, $credit] = $this->ledgerSplit((string) $doc->operation, $doc->type_code, (float) $doc->net_to_pay);
            $txByParty[$doc->party_id][] = [
                'type'      => 'document',
                'date'      => substr((string) $doc->document_date, 0, 10),
                'datetime'  => (string) $doc->created_at,
                'reference' => $doc->document_number,
                'label'     => $doc->type_name,
                'type_code' => $doc->type_code,
                'debit'     => $debit,
                'credit'    => $credit,
            ];
        }
        foreach ($payments as $p) {
            $amount = (float) $p->amount;
            if ($p->direction === 'out') {
                $debit  = round($amount, 2);
                $credit = 0.0;
            } else {
                $debit  = 0.0;
                $credit = round($amount, 2);
            }
            $txByParty[$p->party_id][] = [
                'type'      => 'payment',
                'date'      => substr((string) $p->payment_date, 0, 10),
                'datetime'  => (string) $p->created_at,
                'reference' => $p->payment_number,
                'label'     => $p->mode_name ?: 'ط¯ظپط¹ط©',
                'type_code' => null,
                'debit'     => $debit,
                'credit'    => $credit,
            ];
        }

        // 6. طھط±طھظٹط¨ ط²ظ…ظ†ظٹ + ط±طµظٹط¯ ط¬ط§ط±ظٹ
        $resultParties = [];
        $totalDebit    = 0.0;
        $totalCredit   = 0.0;
        $txCount       = 0;

        foreach ($parties as $party) {
            $opening = round($openingMap[$party->id] ?? 0.0, 2);
            $txs     = $txByParty[$party->id] ?? [];

            // ط£ط·ط±ط§ظپ ط¨ظ„ط§ ط­ط±ظƒط© ظپظٹ ط§ظ„ظپطھط±ط© ظˆظ„ط§ ط±طµظٹط¯ ط§ظپطھطھط§ط­ظٹ â†’ طھظڈطھط¬ط§ظ‡ظ„
            if (empty($txs) && abs($opening) < 0.005) {
                continue;
            }

            usort($txs, function ($a, $b) {
                $cmp = strcmp($a['date'], $b['date']);
                if ($cmp !== 0) return $cmp;
                $cmp = strcmp($a['datetime'] ?? '', $b['datetime'] ?? '');
                if ($cmp !== 0) return $cmp;
                if ($a['type'] !== $b['type']) return $a['type'] === 'document' ? -1 : 1;
                return strcmp((string) $a['reference'], (string) $b['reference']);
            });

            $running  = $opening;
            $pDebit   = 0.0;
            $pCredit  = 0.0;
            foreach ($txs as $i => &$tx) {
                $tx['seq']     = $i + 1;
                $running += $tx['debit'] - $tx['credit'];
                $tx['balance'] = round($running, 2);
                $pDebit  += $tx['debit'];
                $pCredit += $tx['credit'];
            }
            unset($tx);

            $resultParties[] = [
                'id'              => $party->id,
                'name'            => $party->name,
                'code'            => $party->code,
                'party_type_id'   => $party->party_type_id,
                'opening_balance' => $opening,
                'closing_balance' => round($running, 2),
                'total_debit'     => round($pDebit, 2),
                'total_credit'    => round($pCredit, 2),
                'transactions'    => $txs,
            ];

            $totalDebit  += $pDebit;
            $totalCredit += $pCredit;
            $txCount     += count($txs);
        }

        usort($resultParties, fn($a, $b) => strcmp($a['name'], $b['name']));

        return [
            'parties' => $resultParties,
            'summary' => [
                'party_count'       => count($resultParties),
                'transaction_count' => $txCount,
                'total_debit'       => round($totalDebit, 2),
                'total_credit'      => round($totalCredit, 2),
                'net'               => round($totalDebit - $totalCredit, 2),
            ],
        ];
    }

    /**
     * طھظ‚ط³ظٹظ… ظ…ط¨ظ„ط؛ ط­ط±ظƒط© ط¥ظ„ظ‰ (ظ…ط¯ظٹظ† / ط¯ط§ط¦ظ†) ظˆظپظ‚ ط§طھظپط§ظ‚ظٹط© ط§ظ„ط±طµظٹط¯ ط§ظ„ظ…ظˆط­ط¯ط©:
     * ط¨ظٹط¹ â†’ ظ…ط¯ظٹظ† (+)طŒ ط¥ط±ط¬ط§ط¹ ط¨ظٹط¹ (AV) â†’ ط¯ط§ط¦ظ†طŒ ط´ط±ط§ط، â†’ ط¯ط§ط¦ظ† (âˆ’)طŒ ط¥ط±ط¬ط§ط¹ ط´ط±ط§ط، (AA) â†’ ظ…ط¯ظٹظ†.
     */
    private function ledgerSplit(string $operation, ?string $code, float $net): array
    {
        $net = round($net, 2);
        if ($operation === 'sale') {
            return $code === 'AV' ? [0.0, $net] : [$net, 0.0];
        }
        if ($operation === 'purchase') {
            return $code === 'AA' ? [$net, 0.0] : [0.0, $net];
        }
        return [0.0, 0.0];
    }
}
