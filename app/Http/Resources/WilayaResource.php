<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class WilayaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'arabic_name' => $this->arabic_name,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
