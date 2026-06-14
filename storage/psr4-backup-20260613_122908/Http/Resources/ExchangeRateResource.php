<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExchangeRateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'company_id'       => $this->company_id,
            'from_currency_id' => $this->from_currency_id,
            'from_currency'    => new CurrencyResource($this->whenLoaded('fromCurrency')),
            'to_currency_id'   => $this->to_currency_id,
            'to_currency'      => new CurrencyResource($this->whenLoaded('toCurrency')),
            'rate'             => $this->rate,
            'rate_date'        => $this->rate_date?->toDateString(),
            'created_at'       => $this->created_at?->toDateTimeString(),
            'updated_at'       => $this->updated_at?->toDateTimeString(),
        ];
    }
}
