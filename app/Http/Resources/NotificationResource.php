<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'type'            => $this->type,
            'company_id'      => $this->company_id,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id'   => $this->notifiable_id,
            'data'            => $this->data,
            'read_at'         => $this->read_at?->toDateTimeString(),
            'is_read'         => ! is_null($this->read_at),
            'created_at'      => $this->created_at?->toDateTimeString(),
            'updated_at'      => $this->updated_at?->toDateTimeString(),
        ];
    }
}
