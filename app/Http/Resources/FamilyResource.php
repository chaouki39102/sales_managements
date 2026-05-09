<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'description'   => $this->description,
            'parent_id'     => $this->parent_id,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_by'    => $this->created_by,
            'updated_by'    => $this->updated_by,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
            'deleted_at'    => $this->deleted_at,

            // Relations
            'parent'        => new FamilyResource($this->whenLoaded('parent')),
            'children'      => FamilyResource::collection($this->whenLoaded('children')),
        ];
    }
}
