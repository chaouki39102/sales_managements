<?php

namespace App\Services;

use App\Models\CommercialDocumentLine;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductSuggestionService
{
    public function getSuggestions(int $partyId, int $limit = 5, ?bool $isPurchase = null): array
    {
        $query = CommercialDocumentLine::query()
            ->join('commercial_documents', 'commercial_document_lines.commercial_document_id', '=', 'commercial_documents.id')
            ->join('products', 'commercial_document_lines.product_id', '=', 'products.id')
            ->join('document_types', 'commercial_documents.document_type_id', '=', 'document_types.id')
            ->join('document_base_operations', 'document_types.document_base_operation_id', '=', 'document_base_operations.id')
            ->where('commercial_documents.party_id', $partyId)
            ->whereNotNull('commercial_document_lines.product_id')
            ->select(
                'products.id',
                'products.name',
                'products.ref',
                DB::raw('COUNT(DISTINCT commercial_documents.id) as order_count'),
                DB::raw('SUM(commercial_document_lines.quantity) as total_qty'),
                DB::raw('MAX(commercial_document_lines.created_at) as last_purchased_at'),
            );

        if ($isPurchase === true) {
            $query->where('document_base_operations.name', 'purchase');
        } elseif ($isPurchase === false) {
            $query->where('document_base_operations.name', 'sale');
        }

        $products = $query
            ->groupBy('products.id', 'products.name', 'products.ref')
            ->orderByDesc('order_count')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        if ($products->isEmpty()) {
            return [];
        }

        $productIds = $products->pluck('id');

        $lastPrices = CommercialDocumentLine::query()
            ->join('commercial_documents', 'commercial_document_lines.commercial_document_id', '=', 'commercial_documents.id')
            ->whereIn('commercial_document_lines.product_id', $productIds)
            ->where('commercial_documents.party_id', $partyId)
            ->select(
                'commercial_document_lines.product_id',
                DB::raw('MAX(commercial_document_lines.created_at) as last_created'),
            )
            ->groupBy('commercial_document_lines.product_id')
            ->get()
            ->keyBy('product_id');

        $priceQuery = CommercialDocumentLine::query()
            ->whereIn('product_id', $productIds)
            ->whereIn('created_at', $lastPrices->pluck('last_created'))
            ->select('product_id', 'unit_price_ht', 'tva_rate')
            ->get()
            ->keyBy('product_id');

        $result = [];
        foreach ($products as $p) {
            $lastPriceRow = $priceQuery->get($p->id);
            $result[] = [
                'id'               => $p->id,
                'name'             => $p->name,
                'ref'              => $p->ref,
                'order_count'      => (int) $p->order_count,
                'total_qty'        => (float) $p->total_qty,
                'suggested_price'  => $lastPriceRow ? (float) $lastPriceRow->unit_price_ht : null,
                'suggested_tva'    => $lastPriceRow ? (float) $lastPriceRow->tva_rate : null,
            ];
        }

        return $result;
    }
}
