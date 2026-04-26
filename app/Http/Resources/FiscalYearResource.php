<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ✅ إنشاء: FiscalYearResource
 * الخطأ: Class "App\Http\Resources\FiscalYearResource" not found
 * الحل: إنشاء الملف في المسار الصحيح
 *       app/Http/Resources/FiscalYearResource.php
 */
class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'start_date'   => $this->start_date?->toDateString(),
            'end_date'     => $this->end_date?->toDateString(),
            'is_closed'    => (bool) $this->is_closed,
            'is_current'   => (bool) $this->is_current,
            'closed_at'    => $this->closed_at?->toDateString(),
            'closed_by'    => $this->closed_by,
            // ✅ العلاقة: include=closedBy → يُحمَّل كـ closed_by_user
            'closed_by_user' => $this->whenLoaded('closedBy', function () {
                return [
                    'id'   => $this->closedBy->id,
                    'name' => $this->closedBy->name,
                ];
            }),
            'closing_notes' => $this->closing_notes,
            'created_at'   => $this->created_at?->toDateTimeString(),
            'updated_at'   => $this->updated_at?->toDateTimeString(),
        ];
    }
}
