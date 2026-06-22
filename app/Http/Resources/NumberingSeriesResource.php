<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NumberingSeriesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'document_type_id'   => $this->document_type_id,
            'warehouse_id'       => $this->warehouse_id,
            'prefix'             => $this->prefix,
            'suffix'             => $this->suffix,
            'format'             => $this->format,
            'last_number'        => $this->last_number,
            'padding'            => $this->padding,
            'start_number'       => $this->start_number,
            'max_number'         => $this->max_number,
            'reset_yearly'       => $this->reset_yearly,
            'reset_monthly'      => $this->reset_monthly,
            'current_year'       => $this->current_year,
            'current_month'      => $this->current_month,
            'reset_date'         => $this->reset_date,
            'active'             => $this->active,
            'is_locked'          => $this->is_locked,
            'created_at'         => $this->created_at,
            'updated_at'         => $this->updated_at,

            // عدد المستندات المرتبطة (يتم جلبه عبر withCount)
            'commercial_documents_count' => $this->commercial_documents_count ?? 0,

            // Relations
            'document_type'      => new DocumentTypeResource($this->whenLoaded('documentType')),
            'warehouse'          => new WarehouseResource($this->whenLoaded('warehouse')),
        ];
    }
}
