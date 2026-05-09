<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'file_name'       => $this->file_name,
            'file_path'       => $this->file_path,
            'file_url'        => $this->when($this->file_path, fn() => asset('storage/' . $this->file_path)),
            'file_type'       => $this->file_type,
            'file_extension'  => $this->file_extension,
            'file_size'       => $this->file_size,
            'attachable_type' => $this->attachable_type,
            'attachable_id'   => $this->attachable_id,
            'title'           => $this->title,
            'description'     => $this->description,
            'category'        => $this->category,
            'is_public'       => $this->is_public,
            'disk'            => $this->disk,
            'uploaded_by'     => new UserResource($this->whenLoaded('uploadedBy')),
            'created_at'      => $this->created_at?->toDateTimeString(),
            'updated_at'      => $this->updated_at?->toDateTimeString(),
        ];
    }
}
