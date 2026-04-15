<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExchangeRateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from_currency_id' => $this->from_currency_id,
            'to_currency_id' => $this->to_currency_id,
            'rate' => $this->rate,
            'rate_date' => $this->rate_date?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'fromCurrency' => $this->whenLoaded('fromCurrency', fn() => [
                    'id' => $this->fromCurrency->id,
                    'code' => $this->fromCurrency->code,
                    'name' => $this->fromCurrency->name,
                ]),
                'toCurrency' => $this->whenLoaded('toCurrency', fn() => [
                    'id' => $this->toCurrency->id,
                    'code' => $this->toCurrency->code,
                    'name' => $this->toCurrency->name,
                ]),
            ],
        ];
    }
}