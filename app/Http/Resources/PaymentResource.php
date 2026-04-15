<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commercial_document_id' => $this->commercial_document_id,
            'amount' => $this->amount,
            'payment_date' => $this->payment_date?->toIso8601String(),
            'status' => $this->status,
            'payment_mode_id' => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
