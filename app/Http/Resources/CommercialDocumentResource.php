<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommercialDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                           => $this->id,
            'company_id'                   => $this->company_id,
            'document_type_id'             => $this->document_type_id,
            'numbering_series_id'          => $this->numbering_series_id,
            'document_number'              => $this->document_number,
            'user_id'                      => $this->user_id,
            'party_id'                     => $this->party_id,
            'warehouse_id'                 => $this->warehouse_id,
            'fiscal_year_id'               => $this->fiscal_year_id,
            'currency_id'                  => $this->currency_id,
            'exchange_rate'                => $this->exchange_rate,
            'document_date'                => $this->document_date,
            'issued_at'                    => $this->issued_at,
            'due_date'                     => $this->due_date,
            'delivery_date'                => $this->delivery_date,
            'total_ht'                     => $this->total_ht,
            'total_tva'                    => $this->total_tva,
            'total_discount'               => $this->total_discount,
            'total_stamp'                  => $this->total_stamp,
            'total_ttc'                    => $this->total_ttc,
            'net_to_pay'                   => $this->net_to_pay,
            'paid_amount'                  => $this->paid_amount,
            'remaining_amount'             => $this->remaining_amount,
            'notes'                        => $this->notes,
            'internal_notes'               => $this->internal_notes,
            'payment_terms'                => $this->payment_terms,
            'shipping_info'                => $this->shipping_info,
            'legal_mentions'               => $this->legal_mentions,
            'document_status_id'           => $this->document_status_id,
            'fiscal_stamp_id'              => $this->fiscal_stamp_id,
            'is_locked'                    => $this->is_locked,
            'validated_at'                 => $this->validated_at,
            'validated_by'                 => $this->validated_by,
            'cancellation_reason'          => $this->cancellation_reason,
            'source_document_id'           => $this->source_document_id,
            'cancellation_of_document_id'  => $this->cancellation_of_document_id,
            'qr_code_data'                 => $this->qr_code_data,
            'is_exported_to_accounting'    => $this->is_exported_to_accounting,
            'exported_at'                  => $this->exported_at,
            'created_by'                   => $this->created_by,
            'updated_by'                   => $this->updated_by,
            'created_at'                   => $this->created_at,
            'updated_at'                   => $this->updated_at,
            'deleted_at'                   => $this->deleted_at,

            // Relations
            'document_type'                => new DocumentTypeResource($this->whenLoaded('documentType')),
            'numbering_series'             => new NumberingSeriesResource($this->whenLoaded('numberingSeries')),
            'party'                        => new PartyResource($this->whenLoaded('party')),
            'warehouse'                    => new WarehouseResource($this->whenLoaded('warehouse')),
            'fiscal_year'                  => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'currency'                     => new CurrencyResource($this->whenLoaded('currency')),
            'document_status'              => new DocumentStatusResource($this->whenLoaded('documentStatus')),
            'fiscal_stamp'                 => new FiscalStampResource($this->whenLoaded('fiscalStamp')),
            'lines'                        => CommercialDocumentLineResource::collection($this->whenLoaded('lines')),
            'payments'                     => PaymentResource::collection($this->whenLoaded('payments')),
            'source_document'              => new CommercialDocumentResource($this->whenLoaded('sourceDocument')),
            'balance_data'                 => $this->balance_data ?? null,
        ];
    }
}
