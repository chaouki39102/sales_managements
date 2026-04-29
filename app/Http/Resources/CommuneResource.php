<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'post_code' => $this->post_code,
            'name' => $this->name,
            'arabic_name' => $this->arabic_name,
            'wilaya_id' => $this->wilaya_id,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'wilaya' => $this->whenLoaded('wilaya', fn() => [
                    'id' => $this->wilaya->id,
                    'code' => $this->wilaya->code,
                    'name' => $this->wilaya->name,
                ]),
            ],
        ];
    }
}
