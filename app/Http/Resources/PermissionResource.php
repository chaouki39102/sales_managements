<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'display_name' => $this->display_name,
            'group' => $this->group,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'roles' => $this->whenLoaded('roles', fn() => 
                    $this->roles->map(fn($r) => [
                        'id' => $r->id,
                        'name' => $r->name,
                        'display_name' => $r->display_name,
                    ])
                ),
            ],
        ];
    }
}