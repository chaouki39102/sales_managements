<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalanceStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'fiscal_year_id'     => $this->fiscal_year_id,
            'fiscal_year'        => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'product_id'         => $this->product_id,
            'product'            => new ProductResource($this->whenLoaded('product')),
            'warehouse_id'       => $this->warehouse_id,
            'warehouse'          => new WarehouseResource($this->whenLoaded('warehouse')),
            'opening_quantity'   => $this->opening_quantity,
            'opening_value'      => $this->opening_value,
            'lot_number'         => $this->lot_number,
            'manufacturing_date' => $this->manufacturing_date?->toDateString(),
            'expiration_date'    => $this->expiration_date?->toDateString(),
            'created_at'         => $this->created_at?->toDateTimeString(),
            'updated_at'         => $this->updated_at?->toDateTimeString(),
        ];
    }
}
