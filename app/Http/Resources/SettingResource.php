<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'key'           => $this->key,
            'group'         => $this->group,
            'value'         => $this->value,
            'type'          => $this->type,
            'description'   => $this->description,
            'is_public'     => $this->is_public,
            'is_editable'   => $this->is_editable,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at?->toDateTimeString(),
            'updated_at'    => $this->updated_at?->toDateTimeString(),
        ];
    }
}
