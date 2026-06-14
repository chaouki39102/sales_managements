<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'company'     => new CompanyResource($this->whenLoaded('company')),
            'user_id'     => $this->user_id,
            'user'        => new UserResource($this->whenLoaded('user')),
            'role'        => $this->role,
            'is_default'  => $this->is_default,
            'active'      => $this->active,
            'invited_by'  => $this->invited_by,
            'inviter'     => new UserResource($this->whenLoaded('inviter')),
            'joined_at'   => $this->joined_at?->toDateTimeString(),
            'created_at'  => $this->created_at?->toDateTimeString(),
            'updated_at'  => $this->updated_at?->toDateTimeString(),
        ];
    }
}
