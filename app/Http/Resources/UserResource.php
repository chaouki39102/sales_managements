<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'email'         => $this->email,
            'username'      => $this->username,
            'phone'         => $this->phone,
            'avatar'        => $this->avatar,
            'bio'           => $this->bio,
            'job_title'     => $this->job_title,
            'birth_date'    => $this->birth_date?->toIso8601String(),
            'address'       => $this->address,
            'full_address'  => $this->full_address,
            'active'        => (bool) $this->active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),

            'gender'  => $this->whenLoaded('gender', fn() => [
                'id'   => $this->gender->id,
                'name' => $this->gender->name,
            ]),
            'commune' => $this->whenLoaded('commune', fn() => [
                'id'   => $this->commune->id,
                'name' => $this->commune->name,
            ]),
            'wilaya'  => $this->whenLoaded('wilaya', fn() => [
                'id'   => $this->wilaya->id,
                'name' => $this->wilaya->name,
            ]),

            // الأدوار مع صلاحياتها المدمجة
            'roles' => RoleResource::collection($this->whenLoaded('roles')),

            // الصلاحيات المباشرة للمستخدم (Direct Permissions) — كـ objects مع id
            // الفرونت يحتاج id للمقارنة في PermMatrix
            'permissions' => $this->whenLoaded('permissions', fn() =>
                $this->permissions->map(fn($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name ?? $p->name,
                    'group'        => $p->group ?? null,
                ])
            ),

            // صلاحيات الدور المُعيَّن — لعرضها محددة في PermMatrix عند التعديل
            // هذا يحل مشكلة: "عند تعيين دور للمستخدم لا تجد أي صلاحية محددة"
            'role_permissions' => $this->whenLoaded('roles', fn() =>
                $this->getPermissionsViaRoles()->map(fn($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name ?? $p->name,
                    'group'        => $p->group ?? null,
                ])
            ),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
