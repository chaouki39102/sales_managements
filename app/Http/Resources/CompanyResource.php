<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'commercial_name'     => $this->commercial_name,
            'slug'                => $this->slug,
            'portal_slug'         => $this->portal_slug,
            'activity'            => $this->activity,
            'rc'                  => $this->rc,
            'nif'                 => $this->nif,
            'nis'                 => $this->nis,
            'ai'                  => $this->ai,
            'legal_form_id'       => $this->legal_form_id,
            'capital_amount'      => $this->capital_amount,
            'rc_date'             => $this->rc_date,
            'address'             => $this->address,
            'commune_id'          => $this->commune_id,
            'wilaya_id'           => $this->wilaya_id,
            'phone'               => $this->phone,
            'mobile'              => $this->mobile,
            'fax'                 => $this->fax,
            'email'               => $this->email,
            'avatar'              => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'bank_name'           => $this->bank_name,
            'rib'                 => $this->rib,
            'owner_id'            => $this->owner_id,
            'active'              => $this->active,
            'plan'                => $this->plan,
            'trial_ends_at'       => $this->trial_ends_at,
            'max_users'           => $this->max_users,
            'max_warehouses'      => $this->max_warehouses,
            'max_products'        => $this->max_products,
            'verified_at'         => $this->verified_at,
            'suspended_at'        => $this->suspended_at,
            'suspension_reason'   => $this->suspension_reason,
            'deactivated_at'      => $this->deactivated_at,
            'notes'               => $this->notes,
            'settings_json'       => $this->settings_json,
            'created_by'          => $this->created_by,
            'updated_by'          => $this->updated_by,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Computed
            'avatar_url'          => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'is_suspended'        => !is_null($this->suspended_at),
            'is_verified'         => !is_null($this->verified_at),
            'is_operational'      => $this->active && is_null($this->suspended_at),
            'users_count'         => $this->when($this->users_count !== null, $this->users_count),

            // Relations
            'legal_form'          => new LegalFormResource($this->whenLoaded('legalForm')),
            'commune'             => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'              => new WilayaResource($this->whenLoaded('wilaya')),
            'owner'               => new UserResource($this->whenLoaded('owner')),
        ];
    }
}
