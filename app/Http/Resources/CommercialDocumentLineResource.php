<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommercialDocumentLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commercial_document_id' => $this->commercial_document_id,
            'product_id' => $this->product_id,
            'line_order' => $this->line_order,
            'description' => $this->description,
            'quantity' => $this->quantity,
            'delivered_quantity' => $this->delivered_quantity,
            'returned_quantity' => $this->returned_quantity,
            'unit_price_ht' => $this->unit_price_ht,
            'discount_percentage' => $this->discount_percentage,
            'discount_amount' => $this->discount_amount,
            'additional_costs' => $this->additional_costs,
            'total_additional_cost' => $this->total_additional_cost,
            'total_discount_amount' => $this->total_discount_amount,
            'tva_rate' => $this->tva_rate,
            'total_ht' => $this->total_ht,
            'total_tva' => $this->total_tva,
            'total_ttc' => $this->total_ttc,
            'stock_lot_id' => $this->stock_lot_id,
            'is_auto_split' => $this->is_auto_split,
            'parent_line_id' => $this->parent_line_id,
            'line_attributes' => $this->line_attributes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'commercialDocument' => $this->whenLoaded('commercialDocument', fn() => [
                    'id' => $this->commercialDocument->id,
                    'document_number' => $this->commercialDocument->document_number,
                ]),
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'stockLot' => $this->whenLoaded('stockLot', fn() => [
                    'id' => $this->stockLot->id,
                    'lot_number' => $this->stockLot->lot_number,
                ]),
            ],

            'computed' => [
                'remaining_quantity' => $this->getRemainingQuantity(),
                'is_fully_delivered' => $this->isFullyDelivered(),
                'has_discount' => $this->hasDiscount(),
            ],
        ];
    }
}
