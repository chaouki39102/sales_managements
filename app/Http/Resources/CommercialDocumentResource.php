<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Commercial Document Resource
 *
 * @package App\Http\Resources
 */
class CommercialDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_type_id' => $this->document_type_id,
            'numbering_series_id' => $this->numbering_series_id,
            'document_number' => $this->document_number,
            'user_id' => $this->user_id,
            'party_id' => $this->party_id,
            'warehouse_id' => $this->warehouse_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'currency_id' => $this->currency_id,
            'exchange_rate' => $this->exchange_rate,
            'document_date' => $this->document_date?->toDateString(),
            'issued_at' => $this->issued_at?->toIso8601String(),
            'due_date' => $this->due_date?->toDateString(),
            'delivery_date' => $this->delivery_date?->toDateString(),
            'total_ht' => $this->total_ht,
            'total_tva' => $this->total_tva,
            'total_discount' => $this->total_discount,
            'total_stamp' => $this->total_stamp,
            'total_ttc' => $this->total_ttc,
            'net_to_pay' => $this->net_to_pay,
            'paid_amount' => $this->paid_amount,
            'remaining_amount' => $this->remaining_amount,
            'notes' => $this->notes,
            'internal_notes' => $this->internal_notes,
            'document_status_id' => $this->document_status_id,
            'is_locked' => $this->is_locked,
            'validated_at' => $this->validated_at?->toIso8601String(),
            'validated_by' => $this->validated_by,
            'is_proforma' => $this->is_proforma,
            'cancellation_reason' => $this->cancellation_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'documentType' => $this->whenLoaded('documentType', fn() => [
                    'id' => $this->documentType->id,
                    'name' => $this->documentType->name,
                    'code' => $this->documentType->code,
                ]),
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                    'code' => $this->party->code,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
                'currency' => $this->whenLoaded('currency', fn() => [
                    'id' => $this->currency->id,
                    'name' => $this->currency->name,
                    'code' => $this->currency->code,
                ]),
                'documentStatus' => $this->whenLoaded('documentStatus', fn() => [
                    'id' => $this->documentStatus->id,
                    'name' => $this->documentStatus->name,
                ]),
                'lines' => $this->whenLoaded('lines', fn() =>
                    $this->lines->map(fn($line) => [
                        'id' => $line->id,
                        'product_variant_id' => $line->product_variant_id,
                        'line_order' => $line->line_order,
                        'description' => $line->description,
                        'quantity' => $line->quantity,
                        'unit_price_ht' => $line->unit_price_ht,
                        'discount_percentage' => $line->discount_percentage,
                        'discount_amount' => $line->discount_amount,
                        'tva_rate' => $line->tva_rate,
                        'total_ht' => $line->total_ht,
                        'total_tva' => $line->total_tva,
                        'total_ttc' => $line->total_ttc,
                        'productVariant' => $line->whenLoaded('productVariant', fn() => [
                            'id' => $line->productVariant->id,
                            'sku' => $line->productVariant->sku,
                            'name' => $line->productVariant->name,
                        ]),
                    ])
                ),
            ],

            'computed' => [
                'is_fully_paid' => $this->isFullyPaid(),
                'is_overdue' => $this->isOverdue(),
                'can_be_modified' => $this->canBeModified(),
            ],
        ];
    }
}
