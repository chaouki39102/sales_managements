<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'direction' => $this->direction,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'computed' => [
                'is_incoming' => $this->is_incoming(),
                'is_outgoing' => $this->is_outgoing(),
                'is_neutral' => $this->is_neutral(),
            ],
        ];
    }
}
