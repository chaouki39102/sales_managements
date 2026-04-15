<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'commune_id' => $this->commune_id,
            'wilaya_id' => $this->wilaya_id,
            'phone' => $this->phone,
            'manager_name' => $this->manager_name,
            'activity' => $this->activity,
            'rc' => $this->rc,
            'nif' => $this->nif,
            'nis' => $this->nis,
            'ai' => $this->ai,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
