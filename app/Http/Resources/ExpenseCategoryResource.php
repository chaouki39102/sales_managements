<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'is_root' => $this->is_root,
            'has_children' => $this->has_children,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'parent' => $this->whenLoaded('parent', fn() => [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                ]),
                'children' => $this->whenLoaded('children', fn() => 
                    $this->children->map(fn($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'code' => $c->code,
                    ])
                ),
            ],
        ];
    }
}