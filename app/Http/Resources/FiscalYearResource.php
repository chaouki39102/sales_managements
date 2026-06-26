<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'start_date'    => $this->start_date?->format('Y-m-d'),
            'end_date'      => $this->end_date?->format('Y-m-d'),
            'is_closed'     => $this->is_closed,
            'closed_at'     => $this->closed_at,
            'closed_by'     => $this->closed_by,
            'is_current'    => $this->is_current,
            'closing_notes' => $this->closing_notes,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}
