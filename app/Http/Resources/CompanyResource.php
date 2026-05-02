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
            'nif'             => $this->nif,
            'nis'             => $this->nis,
            'rc'              => $this->rc,
            'legal_form_id'   => $this->legal_form_id,
            'wilaya_id'       => $this->wilaya_id,
            'commune_id'      => $this->commune_id,
            'owner_id'        => $this->owner_id,

            // ── حالة الشركة (يحتاجها الـ frontend لعرض الـ badge) ──
            'is_active'       => (bool) $this->is_active,
            'is_suspended'    => (bool) $this->is_suspended,       // accessor من الـ Model
            'is_operational'  => (bool) $this->is_operational,     // is_active && !suspended
            'is_verified'     => (bool) $this->is_verified,
            'is_on_trial'     => (bool) $this->is_on_trial,
            'trial_days_remaining' => $this->trial_days_remaining,

            // ── خطة الاشتراك ──
            'plan'            => $this->plan ?? 'free',
            'max_users'       => $this->max_users,
            'max_warehouses'  => $this->max_warehouses,
            'max_products'    => $this->max_products,

            // ── علاقات اختيارية (تُحمَّل عند الطلب فقط) ──
            'owner'           => $this->whenLoaded('owner', fn () => [
                'id'   => $this->owner->id,
                'name' => $this->owner->name,
            ]),

            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),
        ];
    }
}