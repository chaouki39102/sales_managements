<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'lot_number'          => $this->lot_number,
            'product_id'          => $this->product_id,
            'warehouse_id'        => $this->warehouse_id,
            'manufacturing_date'  => $this->manufacturing_date,
            'expiration_date'     => $this->expiration_date,
            'purchase_date'       => $this->purchase_date,
            'purchase_price'      => $this->purchase_price,
            'legal_selling_price' => $this->legal_selling_price,
            'margin_percentage'   => $this->margin_percentage,
            'original_quantity'   => $this->original_quantity,
            'remaining_quantity'  => $this->remaining_quantity,
            'is_depleted'         => $this->is_depleted,
            'total_cost'          => $this->total_cost,
            'remaining_value'     => $this->remaining_value,
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
