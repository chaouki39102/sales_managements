<?php

// app/Http/Resources/EmploymentContractResource.php (علاقات مسطحة)
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmploymentContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'employee_id'     => $this->employee_id,
            'contract_type'   => $this->contract_type,
            'start_date'      => $this->start_date?->toIso8601String(),
            'end_date'        => $this->end_date?->toIso8601String(),
            'base_salary'     => $this->base_salary,
            'job_title'       => $this->job_title,
            'department'      => $this->department,
            'active'          => $this->active,
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),

            // علاقة مسطحة
            'employee'        => new EmployeeResource($this->whenLoaded('employee')),
        ];
    }
}