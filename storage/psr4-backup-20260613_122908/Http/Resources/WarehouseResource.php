<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'company_id'   => $this->company_id,
            'name'         => $this->name,
            'code'         => $this->code,
            'address'      => $this->address,
            'commune_id'   => $this->commune_id,
            'wilaya_id'    => $this->wilaya_id,
            'phone'        => $this->phone,
            'manager_name' => $this->manager_name,
            'activity'     => $this->activity,
            'rc'           => $this->rc,
            'nif'          => $this->nif,
            'nis'          => $this->nis,
            'ai'           => $this->ai,
            'active'       => $this->active,
            'created_by'   => $this->created_by,
            'updated_by'   => $this->updated_by,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
            'deleted_at'   => $this->deleted_at,

            // Relations
            'commune'      => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'       => new WilayaResource($this->whenLoaded('wilaya')),
        ];
    }
}
