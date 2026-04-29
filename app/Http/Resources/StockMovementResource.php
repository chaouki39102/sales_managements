<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'stock_movement_type_id' => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id,
            'movement_date' => $this->movement_date?->toIso8601String(),
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'cost_price' => $this->cost_price,
            'total_price' => $this->total_price,
            'stock_balance_after' => $this->stock_balance_after,
            'lot_number' => $this->lot_number,
            'expiration_date' => $this->expiration_date?->toIso8601String(),
            'reason' => $this->reason,
            'notes' => $this->notes,
            'is_validated' => $this->is_validated,
            'validated_at' => $this->validated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
                'stockMovementType' => $this->whenLoaded('stockMovementType', fn() => [
                    'id' => $this->stockMovementType->id,
                    'name' => $this->stockMovementType->name,
                    'direction' => $this->stockMovementType->direction,
                ]),
            ],

            'computed' => [
                'is_incoming' => $this->is_incoming(),
                'is_outgoing' => $this->is_outgoing(),
                'is_adjustment' => $this->is_adjustment(),
            ],
        ];
    }
}
