<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommercialDocumentLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'company_id'               => $this->company_id,
            'commercial_document_id'   => $this->commercial_document_id,
            'product_id'               => $this->product_id,
            'line_order'               => $this->line_order,
            'description'              => $this->description,
            'quantity'                 => $this->quantity,
            'delivered_quantity'       => $this->delivered_quantity,
            'returned_quantity'        => $this->returned_quantity,
            'unit_price_ht'            => $this->unit_price_ht,
            'discount_percentage'      => $this->discount_percentage,
            'discount_amount'          => $this->discount_amount,
            'discount_amount_per_unit' => $this->discount_amount_per_unit,
            'tva_rate'                 => $this->tva_rate,
            'total_ht'                 => $this->total_ht,
            'total_tva'                => $this->total_tva,
            'total_ttc'                => $this->total_ttc,
            'additional_costs'         => $this->additional_costs,
            'total_additional_cost'    => $this->total_additional_cost,
            'total_discount_amount'    => $this->total_discount_amount,
            'packaging_id'             => $this->packaging_id,
            'packaging_units_snapshot' => $this->packaging_units_snapshot,
            'stock_lot_id'             => $this->stock_lot_id,
            'is_auto_split'            => $this->is_auto_split,
            'parent_line_id'           => $this->parent_line_id,
            'line_attributes'          => $this->line_attributes,
            'notes'                    => $this->notes,
            'created_at'               => $this->created_at,
            'updated_at'               => $this->updated_at,

            // Relations
            'product'                  => new ProductResource($this->whenLoaded('product')),
            'stock_lot'                => new ProductLotResource($this->whenLoaded('stockLot')),
            'packaging'                => new ProductPackagingResource($this->whenLoaded('packaging')),
        ];
    }
}
