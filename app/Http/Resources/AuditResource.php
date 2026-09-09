<?php

namespace App\Http\Resources;

use App\Services\AuditLabelService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $service = app(AuditLabelService::class);

        $auditable = $this->resource->relationLoaded('auditable') ? $this->auditable : null;
        $user      = $this->resource->relationLoaded('user') ? $this->user : null;

        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'user_id'             => $this->user_id,
            'user'                => new UserResource($this->whenLoaded('user')),
            'user_label'          => $user ? $service->displayLabel($user) : 'مستخدم محذوف',
            'user_type'           => $this->user_type,
            'event'               => $this->event,
            'auditable_type'      => $this->auditable_type,
            'auditable_type_label'=> $service->typeLabel($auditable, $this->auditable_type),
            'auditable_id'        => $this->auditable_id,
            'auditable'           => $auditable
                ? [
                    'id'           => (int) $auditable->getKey(),
                    'type_label'   => $service->typeLabel($auditable),
                    'display_label'=> $service->displayLabel($auditable),
                ]
                : null,
            'old_values'          => $this->old_values,
            'new_values'          => $this->new_values,
            'humanized_diff'      => $service->humanizedDiff($this->old_values, $this->new_values, $auditable),
            'url'                 => $this->url,
            'ip_address'          => $this->ip_address,
            'user_agent'          => $this->user_agent,
            'tags'                => $this->tags,
            'created_at'          => $this->created_at?->toDateTimeString(),
            'updated_at'          => $this->updated_at?->toDateTimeString(),
        ];
    }
}
