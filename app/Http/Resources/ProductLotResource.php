<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canViewCost = (bool) ($request->user()?->can('view_cost_price'));

        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'lot_number'          => $this->lot_number,
            'product_id'          => $this->product_id,
            'warehouse_id'        => $this->warehouse_id,
            'manufacturing_date'  => $this->manufacturing_date,
            'expiration_date'     => $this->expiration_date,
            'purchase_date'       => $this->purchase_date,
            'purchase_price'      => $this->when($canViewCost, $this->purchase_price, null),
            'legal_selling_price' => $this->legal_selling_price,
            'margin_percentage'   => $this->when($canViewCost, $this->margin_percentage, null),
            'original_quantity'   => $this->original_quantity,
            'remaining_quantity'  => $this->remaining_quantity,
            'is_depleted'         => $this->is_depleted,
            'total_cost'          => $this->when($canViewCost, $this->total_cost, null),
            'remaining_value'     => $this->when($canViewCost, $this->remaining_value, null),
            'stock_movement_id'   => $this->stock_movement_id,
            'supplier_lot_number' => $this->supplier_lot_number,
            'active'              => $this->active,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'product'             => new ProductResource($this->whenLoaded('product')),
            'warehouse'           => new WarehouseResource($this->whenLoaded('warehouse')),
        ];
    }
}
