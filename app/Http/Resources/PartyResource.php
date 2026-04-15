<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Party Resource
 *
 * تحويل نموذج Party للاستجابة API مع البيانات المطلوبة
 */
class PartyResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'party_type' => [
                'id' => $this->partyType?->id,
                'name' => $this->partyType?->name,
                'display_name' => $this->partyType?->label,
            ],
            'code' => $this->code,
            'name' => $this->name,
            'commercial_name' => $this->commercial_name,
            'slug' => $this->slug,

            // Algerian legal information
            'activity' => $this->activity,
            'rc' => $this->rc,
            'nif' => $this->nif,
            'nis' => $this->nis,
            'ai' => $this->ai,
            'legal_form' => [
                'id' => $this->legalForm?->id,
                'name' => $this->legalForm?->name,
            ],
            'capital_amount' => $this->capital_amount,
            'rc_date' => $this->rc_date?->toIso8601String(),

            // Contact information
            'address' => $this->address,
            'commune' => [
                'id' => $this->commune?->id,
                'name' => $this->commune?->name,
            ],
            'wilaya' => [
                'id' => $this->wilaya?->id,
                'name' => $this->wilaya?->name,
            ],
            'phone' => $this->phone,
            'mobile' => $this->mobile,
            'fax' => $this->fax,
            'email' => $this->email,
            'avatar' => $this->avatar,

            // Banking information
            'bank_name' => $this->bank_name,
            'rib' => $this->rib,

            // Financial settings
            'initial_balance' => $this->initial_balance,
            'credit_limit' => $this->credit_limit,
            'default_price_level' => [
                'id' => $this->defaultPriceLevel?->id,
                'name' => $this->defaultPriceLevel?->name,
            ],
            'credit_days' => $this->credit_days,

            // Tax settings
            'is_tva_exempt' => $this->is_tva_exempt,
            'is_taxable' => $this->is_taxable,
            'tax_option' => $this->tax_option,
            'cnas_number' => $this->cnas_number,
            'tax_regime' => $this->tax_regime,
            'is_final_consumer' => $this->is_final_consumer,
            'is_vat_registered' => $this->is_vat_registered,
            'vat_registration_date' => $this->vat_registration_date?->toIso8601String(),

            // Additional data
            'additional_data' => $this->additional_data,
            'active' => $this->active,

            // Computed fields
            'full_address' => $this->full_address,
            'current_balance' => $this->current_balance,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}