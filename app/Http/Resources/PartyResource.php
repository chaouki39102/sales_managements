<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'company_id'             => $this->company_id,
            'party_type_id'          => $this->party_type_id,
            'code'                   => $this->code,
            'name'                   => $this->name,
            'commercial_name'        => $this->commercial_name,
            'slug'                   => $this->slug,
            'activity'               => $this->activity,
            'rc'                     => $this->rc,
            'nif'                    => $this->nif,
            'nis'                    => $this->nis,
            'ai'                     => $this->ai,
            'legal_form_id'          => $this->legal_form_id,
            'capital_amount'         => $this->capital_amount,
            'rc_date'                => $this->rc_date,
            'address'                => $this->address,
            'commune_id'             => $this->commune_id,
            'wilaya_id'              => $this->wilaya_id,
            'phone'                  => $this->phone,
            'mobile'                 => $this->mobile,
            'fax'                    => $this->fax,
            'email'                  => $this->email,
            'avatar'                 => $this->avatar,
            'bank_name'              => $this->bank_name,
            'rib'                    => $this->rib,
            'initial_balance'        => $this->initial_balance,
            'credit_limit'           => $this->credit_limit,
            'default_price_level_id' => $this->default_price_level_id,
            'credit_days'            => $this->credit_days,
            'allow_credit_sale'      => $this->allow_credit_sale,
            'is_tva_exempt'          => $this->is_tva_exempt,
            'is_taxable'             => $this->is_taxable,
            'tax_option'             => $this->tax_option,
            'cnas_number'            => $this->cnas_number,
            'tax_regime'             => $this->tax_regime,
            'is_final_consumer'      => $this->is_final_consumer,
            'is_vat_registered'      => $this->is_vat_registered,
            'vat_registration_date'  => $this->vat_registration_date,
            'additional_data'        => $this->additional_data,
            'active'                 => $this->active,
            'created_by'             => $this->created_by,
            'updated_by'             => $this->updated_by,
            'created_at'             => $this->created_at,
            'updated_at'             => $this->updated_at,
            'deleted_at'             => $this->deleted_at,

            // Relations
            'party_type'             => new PartyTypeResource($this->whenLoaded('partyType')),
            'legal_form'             => new LegalFormResource($this->whenLoaded('legalForm')),
            'commune'                => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'                 => new WilayaResource($this->whenLoaded('wilaya')),
            'default_price_level'    => new PriceLevelResource($this->whenLoaded('defaultPriceLevel')),
        ];
    }
}
