<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * RoleResource
 *
 * يُحوّل Role model إلى JSON موحّد للفرونت إند.
 * يدعم:
 *   - permissions كـ PermissionResource collection
 *   - users_count إذا كان محمَّلاً
 */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'display_name' => $this->display_name,
            'description'  => $this->description,
            'guard_name'   => $this->guard_name,
            'company_id'   => $this->company_id,

            // ✅ permissions — دائماً array (ليس null)
            'permissions'  => $this->whenLoaded(
                'permissions',
                fn() => PermissionResource::collection($this->permissions),
                []
            ),

            // ✅ users_count — اختياري، يظهر فقط إذا كان محمَّلاً
            'users_count'  => $this->when(
                isset($this->users_count),
                $this->users_count
            ),

            'roles' => $this->whenLoaded('roles', function () {
                // ✅ إذا كانت roles فارغة، ابحث عن super-admin
                $roles = $this->resource->roles;

                if ($roles->isEmpty()) {
                    // المالك قد يكون super-admin بدون company_id
                    $superAdmin = $this->resource->roles()->whereNull('roles.company_id')->get();
                    if ($superAdmin->isNotEmpty()) {
                        return RoleResource::collection($superAdmin);
                    }

                    // أو تحقق من company_user pivot
                    // إذا كان owner_id = $this->id في جدول companies
                    $companyId = app(\App\Services\CompanyContextService::class)->get();
                    if ($companyId) {
                        $company = \App\Models\Company::find($companyId);
                        if ($company && $company->owner_id === $this->resource->id) {
                            // هذا المالك — أضف label مخصص
                            return [['id' => 0, 'name' => 'owner', 'display_name' => 'المالك', 'permissions' => []]];
                        }
                    }
                }

                return RoleResource::collection($roles);
            }),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
