<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_latin' => $this->name_latin,
            'code' => $this->code,
            'description' => $this->description,
            'document_base_operation_id' => $this->document_base_operation_id,
            'affects_stock_direction' => $this->affects_stock_direction,
            'requires_party' => $this->requires_party,
            'affects_accounting' => $this->affects_accounting,
            'is_printable' => $this->is_printable,
            'print_template' => $this->print_template,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'documentBaseOperation' => $this->whenLoaded('documentBaseOperation', fn() => [
                    'id' => $this->documentBaseOperation->id,
                    'name' => $this->documentBaseOperation->name,
                    'label' => $this->documentBaseOperation->label,
                ]),
            ],

            'computed' => [
                'affects_stock_in' => $this->affects_stock_in(),
                'affects_stock_out' => $this->affects_stock_out(),
            ],
        ];
    }
}
