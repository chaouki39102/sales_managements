<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'username'            => $this->username,
            'email'               => $this->email,
            'email_verified_at'   => $this->email_verified_at,
            'phone'               => $this->phone,
            'avatar'              => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'bio'                 => $this->bio,
            'job_title'           => $this->job_title,
            'birth_date'          => $this->birth_date,
            'gender_id'           => $this->gender_id,
            'national_id'         => $this->national_id,
            'address'             => $this->address,
            'commune_id'          => $this->commune_id,
            'wilaya_id'           => $this->wilaya_id,
            'role_id'             => $this->role_id,
            'active'              => $this->active,
            'is_approved'         => $this->is_approved,
            'last_login_at'       => $this->last_login_at,
            'last_login_ip'       => $this->last_login_ip,
            'register_ip'         => $this->register_ip,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // ── Relations ────────────────────────────────────────────
            'gender'  => new GenderResource($this->whenLoaded('gender')),
            'commune' => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'  => new WilayaResource($this->whenLoaded('wilaya')),

            // ✅ roles — unique() لمنع التكرار + display_name
            'roles' => $this->whenLoaded(
                'roles',
                fn () => $this->roles->unique('id')->map(fn ($r) => [
                    'id'           => $r->id,
                    'name'         => $r->name,
                    'display_name' => $r->display_name ?? null,
                ]),
                []
            ),

            // ✅ permissions — unique() + group آمن بدون pivot
            // لا يوجد عمود group في جدول model_has_permissions
            // الـ Frontend يستخرج المجموعة من اسم الصلاحية تلقائياً
            'permissions' => $this->whenLoaded(
                'permissions',
                fn () => $this->permissions->unique('id')->map(fn ($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name ?? null,
                    'group'        => $p->group ?? null, // عمود مباشر في جدول permissions (إن وُجد)
                ]),
                []
            ),
        ];
    }
}
