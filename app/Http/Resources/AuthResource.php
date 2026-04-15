<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'user' => new UserResource($this->whenLoaded('user', $this)),
            'token' => $this->token,
            'token_type' => 'Bearer',
            'expires_in' => 86400, // 24 hours
        ];
    }
}
