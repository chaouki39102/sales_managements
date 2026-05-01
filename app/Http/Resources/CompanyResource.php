<?php
// app/Http/Resources/CompanyResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'commercial_name' => $this->commercial_name,
            'slug'            => $this->slug,
            'email'           => $this->email,
            'phone'           => $this->phone,
            'address'         => $this->address,
            'tax_number'      => $this->tax_number,
            'nif'             => $this->nif,
            'nis'             => $this->nis,
            'rc'              => $this->rc,
            'legal_form_id'   => $this->legal_form_id,
            'wilaya_id'       => $this->wilaya_id,
            'commune_id'      => $this->commune_id,
            'owner_id'        => $this->owner_id,
            'is_active'       => (bool) $this->is_active,
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),
        ];
    }
}
