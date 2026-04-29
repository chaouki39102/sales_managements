<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lot_number' => $this->lot_number,
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'manufacturing_date' => $this->manufacturing_date?->toIso8601String(),
            'expiration_date' => $this->expiration_date?->toIso8601String(),
            'purchase_date' => $this->purchase_date?->toIso8601String(),
            'purchase_price' => $this->purchase_price,
            'legal_selling_price' => $this->legal_selling_price,
            'margin_percentage' => $this->margin_percentage,
            'original_quantity' => $this->original_quantity,
            'remaining_quantity' => $this->remaining_quantity,
            'stock_movement_id' => $this->stock_movement_id,
            'supplier_lot_number' => $this->supplier_lot_number,
            'active' => $this->active,
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
            ],

            'computed' => [
                'is_depleted' => $this->is_depleted,
                'is_expired' => $this->is_expired,
                'total_cost' => $this->total_cost,
                'remaining_value' => $this->remaining_value,
                'is_expiring_soon' => $this->isExpiringSoon(),
            ],
        ];
    }
}
