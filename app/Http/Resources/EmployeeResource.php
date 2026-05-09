<?php

// app/Http/Resources/EmployeeResource.php (علاقات مسطحة)
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'matricule'         => $this->matricule,
            'user_id'           => $this->user_id,
            'first_name'        => $this->first_name,
            'last_name'         => $this->last_name,
            'full_name'         => $this->full_name,
            'nss'               => $this->nss,
            'birth_date'        => $this->birth_date?->toIso8601String(),
            'gender_id'         => $this->gender_id,
            'rib'               => $this->rib,
            'bank_name'         => $this->bank_name,
            'hire_date'         => $this->hire_date?->toIso8601String(),
            'termination_date'  => $this->termination_date?->toIso8601String(),
            'active'            => $this->active,
            'employment_status' => $this->employment_status,
            'created_by'        => $this->created_by,
            'updated_by'        => $this->updated_by,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
            'deleted_at'        => $this->deleted_at?->toIso8601String(),

            // علاقات مسطحة
            'user'              => new UserResource($this->whenLoaded('user')),
            'gender'            => new GenderResource($this->whenLoaded('gender')),
            'contracts'         => EmploymentContractResource::collection($this->whenLoaded('contracts')),
        ];
    }
}