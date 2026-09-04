<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تدقيق المستند التجاري — يُرجع حدث تدقيق واحداً (document_audit_logs).
 * القيم القديمة/الجديدة تُرجع كما خُزّنت (مصفوفة أو نص أو رقم).
 */
class DocumentAuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'document_id'=> $this->document_id,
            'company_id' => $this->company_id,
            'user_id'    => $this->user_id,
            'user'       => new UserResource($this->whenLoaded('user')),
            'action'     => $this->action,
            'field_name' => $this->field_name,
            'old_value'  => $this->old_value,
            'new_value'  => $this->new_value,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}