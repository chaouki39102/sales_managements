<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WilayaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'name' => $this->name, 'arabic_name' => $this->arabic_name,
            'latitude' => $this->latitude, 'longitude' => $this->longitude, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'relations' => ['communes' => $this->whenLoaded('communes', fn() => $this->communes->map(fn($c) => ['id' => $c->id, 'name' => $c->name]))],
        ];
    }
}

class CommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'post_code' => $this->post_code, 'name' => $this->name, 'arabic_name' => $this->arabic_name,
            'wilaya_id' => $this->wilaya_id, 'latitude' => $this->latitude, 'longitude' => $this->longitude, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'relations' => ['wilaya' => $this->whenLoaded('wilaya', fn() => ['id' => $this->wilaya->id, 'name' => $this->wilaya->name])],
        ];
    }
}

class StockMovementTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'direction' => $this->direction, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_incoming' => $this->is_incoming, 'is_outgoing' => $this->is_outgoing, 'is_neutral' => $this->is_neutral,
        ];
    }
}

class ProductTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'manages_stock' => $this->manages_stock, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class PartyTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class DocumentTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'name_latin' => $this->name_latin, 'code' => $this->code,
            'description' => $this->description, 'document_base_operation_id' => $this->document_base_operation_id,
            'affects_stock_direction' => $this->affects_stock_direction, 'requires_party' => $this->requires_party,
            'affects_accounting' => $this->affects_accounting, 'is_printable' => $this->is_printable,
            'print_template' => $this->print_template, 'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'affects_stock_in' => $this->affects_stock_in, 'affects_stock_out' => $this->affects_stock_out,
            'relations' => ['documentBaseOperation' => $this->whenLoaded('documentBaseOperation', fn() => ['id' => $this->documentBaseOperation->id, 'name' => $this->documentBaseOperation->name])],
        ];
    }
}

class CommercialDocumentLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'commercial_document_id' => $this->commercial_document_id, 'product_variant_id' => $this->product_variant_id,
            'line_order' => $this->line_order, 'description' => $this->description, 'quantity' => $this->quantity,
            'delivered_quantity' => $this->delivered_quantity, 'returned_quantity' => $this->returned_quantity,
            'unit_price_ht' => $this->unit_price_ht, 'discount_percentage' => $this->discount_percentage,
            'discount_amount' => $this->discount_amount, 'tva_rate' => $this->tva_rate, 'total_ht' => $this->total_ht,
            'total_tva' => $this->total_tva, 'total_ttc' => $this->total_ttc, 'is_auto_split' => $this->is_auto_split,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'remaining_quantity' => $this->remaining_quantity, 'is_fully_delivered' => $this->is_fully_delivered, 'has_discount' => $this->has_discount,
        ];
    }
}

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_id' => $this->product_id, 'ref' => $this->ref, 'barcode' => $this->barcode,
            'variant_name' => $this->variant_name, 'unit_id' => $this->unit_id, 'tva_id' => $this->tva_id,
            'last_purchase_price' => $this->last_purchase_price, 'average_cost_price' => $this->average_cost_price,
            'default_selling_price_ht' => $this->default_selling_price_ht, 'manages_stock' => $this->manages_stock,
            'allow_negative_stock' => $this->allow_negative_stock, 'has_lots' => $this->has_lots,
            'has_expiration_date' => $this->has_expiration_date, 'min_stock_alert' => $this->min_stock_alert,
            'max_stock_alert' => $this->max_stock_alert, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'current_stock' => $this->current_stock, 'is_low_stock' => $this->is_low_stock,
        ];
    }
}

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'expense_number' => $this->expense_number, 'date' => $this->date?->toIso8601String(),
            'amount' => $this->amount, 'expense_category_id' => $this->expense_category_id, 'fiscal_year_id' => $this->fiscal_year_id,
            'payment_mode_id' => $this->payment_mode_id, 'treasury_account_id' => $this->treasury_account_id,
            'party_id' => $this->party_id, 'description' => $this->description, 'reference' => $this->reference,
            'has_attachments' => $this->has_attachments, 'status' => $this->status, 'is_paid' => $this->is_paid,
            'is_recurring' => $this->is_recurring, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'lot_number' => $this->lot_number, 'product_variant_id' => $this->product_variant_id,
            'warehouse_id' => $this->warehouse_id, 'manufacturing_date' => $this->manufacturing_date?->toIso8601String(),
            'expiration_date' => $this->expiration_date?->toIso8601String(), 'purchase_date' => $this->purchase_date?->toIso8601String(),
            'purchase_price' => $this->purchase_price, 'original_quantity' => $this->original_quantity,
            'remaining_quantity' => $this->remaining_quantity, 'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_depleted' => $this->is_depleted, 'is_expired' => $this->is_expired,
        ];
    }
}

class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'start_date' => $this->start_date?->toIso8601String(),
            'end_date' => $this->end_date?->toIso8601String(), 'is_closed' => $this->is_closed,
            'closed_at' => $this->closed_at?->toIso8601String(), 'is_current' => $this->is_current,
            'closing_notes' => $this->closing_notes, 'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(), 'is_active' => $this->is_active(),
        ];
    }
}

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'payment_number' => $this->payment_number, 'payment_date' => $this->payment_date?->toIso8601String(),
            'amount' => $this->amount, 'currency_id' => $this->currency_id, 'amount_local' => $this->amount_local,
            'payment_mode_id' => $this->payment_mode_id, 'treasury_account_id' => $this->treasury_account_id,
            'check_id' => $this->check_id, 'party_id' => $this->party_id, 'fiscal_year_id' => $this->fiscal_year_id,
            'reference' => $this->reference, 'bank_reference' => $this->bank_reference, 'notes' => $this->notes,
            'status' => $this->status, 'is_reconciled' => $this->is_reconciled,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'product_variant_id' => $this->product_variant_id, 'warehouse_id' => $this->warehouse_id,
            'fiscal_year_id' => $this->fiscal_year_id, 'stock_movement_type_id' => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id, 'movement_date' => $this->movement_date?->toIso8601String(),
            'quantity' => $this->quantity, 'unit_price' => $this->unit_price, 'total_price' => $this->total_price,
            'stock_balance_after' => $this->stock_balance_after, 'reason' => $this->reason, 'is_validated' => $this->is_validated,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_incoming' => $this->is_incoming(), 'is_outgoing' => $this->is_outgoing(), 'is_adjustment' => $this->is_adjustment(),
        ];
    }
}

class GenderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'active' => $this->active,
            'display_order' => $this->display_order, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class InventoryValuationMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'method' => $this->method, 'is_default' => $this->is_default,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class TreasuryAccountTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class FiscalStampResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'min_amount' => $this->min_amount, 'max_amount' => $this->max_amount,
            'stamp_value' => $this->stamp_value, 'type' => $this->type, 'active' => $this->active,
            'valid_from' => $this->valid_from?->toIso8601String(), 'valid_to' => $this->valid_to?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

class DocumentBaseOperationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'label' => $this->label, 'description' => $this->description,
            'active' => $this->active, 'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}