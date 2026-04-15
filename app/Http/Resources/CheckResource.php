<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'check_number' => $this->check_number,
            'check_date' => $this->check_date?->toIso8601String(),
            'due_date' => $this->due_date?->toIso8601String(),
            'amount' => $this->amount,
            'bank_name' => $this->bank_name,
            'account_number' => $this->account_number,
            'drawer_name' => $this->drawer_name,
            'party_id' => $this->party_id,
            'status' => $this->status,
            'cleared_date' => $this->cleared_date?->toIso8601String(),
            'bounce_reason' => $this->bounce_reason,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            'is_overdue' => $this->is_overdue,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                ]),
                'payments' => $this->whenLoaded('payments', fn() => 
                    $this->payments->map(fn($p) => [
                        'id' => $p->id,
                        'payment_number' => $p->payment_number,
                        'amount' => $p->amount,
                    ])
                ),
            ],
        ];
    }
}