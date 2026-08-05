<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Party;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class CustomerInsightService
{
    public function getInsights(int $partyId): array
    {
        $party = Party::with('partyType')->find($partyId);
        if (!$party) {
            return [];
        }

        $lastDocuments = $this->getLastDocuments($partyId);
        $monthlyAvg    = $this->getMonthlyAverage($partyId);
        $paymentDays   = $this->getAveragePaymentDays($partyId);
        $topProducts   = $this->getTopProducts($partyId);

        return [
            'party_id'           => $partyId,
            'party_name'         => $party->name,
            'party_type'         => $party->partyType?->name,
            'document_count'     => $lastDocuments['total_count'],
            'last_documents'     => $lastDocuments['items'],
            'monthly_avg_invoice'=> $monthlyAvg,
            'avg_payment_days'   => $paymentDays,
            'top_products'       => $topProducts,
        ];
    }

    private function getLastDocuments(int $partyId): array
    {
        $docs = CommercialDocument::with(['documentType', 'documentStatus'])
            ->where('party_id', $partyId)
            ->orderBy('document_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        return [
            'total_count' => CommercialDocument::where('party_id', $partyId)->count(),
            'items'       => $docs->map(fn($d) => [
                'id'              => $d->id,
                'document_number' => $d->document_number,
                'document_type'   => $d->documentType?->code,
                'type_name'       => $d->documentType?->name,
                'document_date'   => $d->document_date,
                'net_to_pay'      => (float) $d->net_to_pay,
                'remaining_amount'=> (float) $d->remaining_amount,
                'status'          => $d->documentStatus?->slug,
                'status_label'    => $d->documentStatus?->name,
            ]),
        ];
    }

    private function getMonthlyAverage(int $partyId): ?float
    {
        $oldest = CommercialDocument::where('party_id', $partyId)
            ->orderBy('document_date', 'asc')
            ->first(['document_date']);

        if (!$oldest || !$oldest->document_date) {
            return null;
        }

        $months = max(1, now()->diffInMonths($oldest->document_date) ?: 1);

        $total = CommercialDocument::where('party_id', $partyId)
            ->whereNotNull('validated_at')
            ->sum('net_to_pay');

        return round((float) $total / $months, 2);
    }

    private function getAveragePaymentDays(int $partyId): ?float
    {
        $dayDiff = DB::getDriverName() === 'sqlite'
            ? 'JULIANDAY(payments.payment_date) - JULIANDAY(commercial_documents.due_date)'
            : 'DATEDIFF(payments.payment_date, commercial_documents.due_date)';

        $result = Payment::query()
            ->join('document_payment', 'payments.id', '=', 'document_payment.payment_id')
            ->join('commercial_documents', 'document_payment.commercial_document_id', '=', 'commercial_documents.id')
            ->where('payments.party_id', $partyId)
            ->whereNotNull('commercial_documents.due_date')
            ->where('payments.status', 'confirmed')
            ->select(DB::raw("AVG({$dayDiff}) as avg_days"))
            ->first();

        $avg = $result?->avg_days;
        return $avg !== null ? round((float) $avg, 1) : null;
    }

    private function getTopProducts(int $partyId, int $limit = 5): array
    {
        return CommercialDocumentLine::query()
            ->join('commercial_documents', 'commercial_document_lines.commercial_document_id', '=', 'commercial_documents.id')
            ->join('products', 'commercial_document_lines.product_id', '=', 'products.id')
            ->where('commercial_documents.party_id', $partyId)
            ->select(
                'products.id',
                'products.name',
                'products.ref',
                DB::raw('SUM(commercial_document_lines.quantity) as total_qty'),
                DB::raw('SUM(commercial_document_lines.total_ttc) as total_amount'),
            )
            ->groupBy('products.id', 'products.name', 'products.ref')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($r) => [
                'id'           => $r->id,
                'name'         => $r->name,
                'ref'          => $r->ref,
                'total_qty'    => (float) $r->total_qty,
                'total_amount' => (float) $r->total_amount,
            ])
            ->toArray();
    }
}
