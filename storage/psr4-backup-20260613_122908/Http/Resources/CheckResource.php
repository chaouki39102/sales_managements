<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'check_number'   => $this->check_number,
            'check_date'     => $this->check_date,
            'due_date'       => $this->due_date,
            'amount'         => $this->amount,
            'bank_name'      => $this->bank_name,
            'account_number' => $this->account_number,
            'drawer_name'    => $this->drawer_name,
            'party_id'       => $this->party_id,
            'status'         => $this->status,
            'cleared_date'   => $this->cleared_date,
            'bounce_reason'  => $this->bounce_reason,
            'notes'          => $this->notes,
            'metadata'       => $this->metadata,
            'created_by'     => $this->created_by,
            'updated_by'     => $this->updated_by,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,

            // Relations
            'party'          => new PartyResource($this->whenLoaded('party')),
        ];
    }
}
