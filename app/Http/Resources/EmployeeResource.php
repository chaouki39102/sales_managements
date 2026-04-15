<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'matricule' => $this->matricule,
            'user_id' => $this->user_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'nss' => $this->nss,
            'birth_date' => $this->birth_date?->toIso8601String(),
            'gender_id' => $this->gender_id,
            'rib' => $this->rib,
            'bank_name' => $this->bank_name,
            'hire_date' => $this->hire_date?->toIso8601String(),
            'termination_date' => $this->termination_date?->toIso8601String(),
            'employment_status' => $this->employment_status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'user' => $this->whenLoaded('user', fn() => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ]),
                'gender' => $this->whenLoaded('gender', fn() => [
                    'id' => $this->gender->id,
                    'name' => $this->gender->name,
                ]),
                'contracts' => $this->whenLoaded('contracts', fn() => 
                    $this->contracts->map(fn($c) => [
                        'id' => $c->id,
                        'contract_type' => $c->contract_type,
                        'job_title' => $c->job_title,
                        'is_active' => $c->is_active,
                    ])
                ),
            ],
        ];
    }
}