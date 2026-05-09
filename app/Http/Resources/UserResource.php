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
            'avatar'              => $this->avatar,
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
            'last_login_at'       => $this->last_login_at,
            'last_login_ip'       => $this->last_login_ip,
            'register_ip'         => $this->register_ip,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'gender'              => new GenderResource($this->whenLoaded('gender')),
            'commune'             => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'              => new WilayaResource($this->whenLoaded('wilaya')),
            'roles'   => $this->whenLoaded('roles', fn() =>
            $this->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name])),
        ];
    }
}
