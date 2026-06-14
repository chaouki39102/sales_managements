<?php

// app/Http/Resources/StockMovementResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'company_id'                  => $this->company_id,
            'product_id'                  => $this->product_id,
            'warehouse_id'                => $this->warehouse_id,
            'packaging_id'                => $this->packaging_id,
            'fiscal_year_id'              => $this->fiscal_year_id,
            'stock_movement_type_id'      => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id,
            'movement_date'               => $this->movement_date,
            'quantity'                    => $this->quantity,
            'packaging_quantity'          => $this->packaging_quantity,
            'unit_price'                  => $this->unit_price,
            'cost_price'                  => $this->cost_price,
            'total_price'                 => $this->total_price,
            'price_source'                => $this->price_source,
            'stock_balance_after'         => $this->stock_balance_after,
            'lot_number'                  => $this->lot_number,
            'expiration_date'             => $this->expiration_date,
            'stock_lot_id'                => $this->stock_lot_id,
            'reason'                      => $this->reason,
            'notes'                       => $this->notes,
            'user_id'                     => $this->user_id,
            'parent_movement_id'          => $this->parent_movement_id,
            'is_validated'                => $this->is_validated,
            'validated_by'                => $this->validated_by,
            'validated_at'                => $this->validated_at,
            'created_by'                  => $this->created_by,
            'created_at'                  => $this->created_at,
            'updated_at'                  => $this->updated_at,
            'deleted_at'                  => $this->deleted_at,

            // Relations (تم تصحيح اسم العلاقة)
            'product'                     => new ProductResource($this->whenLoaded('product')),
            'warehouse'                   => new WarehouseResource($this->whenLoaded('warehouse')),
            'stock_movement_type'         => new StockMovementTypeResource($this->whenLoaded('stockMovementType')),
            'stock_lot'                   => new ProductLotResource($this->whenLoaded('stockLot')),
            'packaging'                   => new ProductPackagingResource($this->whenLoaded('packaging')),
        ];
    }
}