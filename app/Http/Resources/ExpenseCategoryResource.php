<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'code'          => $this->code,
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
            'parent'        => new ExpenseCategoryResource($this->whenLoaded('parent')),
            'children'      => ExpenseCategoryResource::collection($this->whenLoaded('children')),
        ];
    }
}
