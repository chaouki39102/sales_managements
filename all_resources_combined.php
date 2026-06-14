<?php

// دمج تلقائي لكل ملفات الـ resources



// ===== ملف: ApiResponse.php =====
namespace App\Http\Resources;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

class ApiResponse extends JsonResource
{
    /**
     * Response status
     */
    protected $success;
    protected $message;
    protected $code;
    protected $meta;

    public function __construct($data = null, $success = true, $message = '', $code = 200, $meta = [])
    {
        parent::__construct($data);

        $this->success = $success;
        $this->message = $message;
        $this->code = $code;
        $this->meta = $meta;
    }

    /**
     * Transform the resource into an array
     */
    public function toArray($request)
    {
        return [
            'success' => $this->success,
            'message' => $this->message,
            'data' => parent::toArray($request),
            'meta' => $this->meta ?: new \stdClass(),
        ];
    }

    /**
     * Customize the response
     */
    public function with($request)
    {
        return [
            'status' => $this->code,
        ];
    }

    /**
     * Success Response
     */
    public static function success($data = null, $message = 'Success', $code = 200, $meta = [])
    {
        return new self($data, true, $message, $code, $meta);
    }

    /**
     * Error Response
     */
    public static function error($message = 'Error', $code = 400, $data = null, $meta = [])
    {
        return new self($data, false, $message, $code, $meta);
    }
}




// ===== ملف: AttachmentResource.php =====
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




// ===== ملف: AuditResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'user_id'        => $this->user_id,
            'user'           => new UserResource($this->whenLoaded('user')),
            'user_type'      => $this->user_type,
            'event'          => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id'   => $this->auditable_id,
            'old_values'     => $this->old_values,
            'new_values'     => $this->new_values,
            'url'            => $this->url,
            'ip_address'     => $this->ip_address,
            'user_agent'     => $this->user_agent,
            'tags'           => $this->tags,
            'created_at'     => $this->created_at?->toDateTimeString(),
            'updated_at'     => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: AuthResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    private string $token;

    public function __construct($resource, string $token = '')
    {
        parent::__construct($resource);
        $this->token = $token;
    }

    public function toArray(Request $request): array
    {
        return [
            'user' => new UserResource($this->whenLoaded('user', $this)),
            'token'      => $this->token,
            'token_type' => 'Bearer',
        ];
    }
}




// ===== ملف: BarcodeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BarcodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'product_id'  => $this->product_id,
            'variant_id'  => $this->variant_id,
            'barcode'     => $this->barcode,
            'type'        => $this->type,
            'is_primary'  => $this->is_primary,
            'unit'        => $this->unit,
            'created_by'  => $this->created_by,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,

            // Relations
            'product'     => new ProductResource($this->whenLoaded('product')),
            'variant'     => new ProductVariantResource($this->whenLoaded('variant')),
        ];
    }
}




// ===== ملف: BrandResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'description'   => $this->description,
            'logo'          => $this->logo,
            'website'       => $this->website,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_by'    => $this->created_by,
            'updated_by'    => $this->updated_by,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
            'deleted_at'    => $this->deleted_at,
        ];
    }
}




// ===== ملف: CheckResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'check_number'   => $this->check_number,
            'check_date'     => $this->check_date,
            'due_date'       => $this->due_date,
            'amount'         => $this->amount,
            'bank_name'      => $this->bank_name,
            'account_number' => $this->account_number,
            'drawer_name'    => $this->drawer_name,
            'party_id'       => $this->party_id,
            'status'         => $this->status,
            'cleared_date'   => $this->cleared_date,
            'bounce_reason'  => $this->bounce_reason,
            'notes'          => $this->notes,
            'metadata'       => $this->metadata,
            'created_by'     => $this->created_by,
            'updated_by'     => $this->updated_by,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,

            // Relations
            'party'          => new PartyResource($this->whenLoaded('party')),
        ];
    }
}




// ===== ملف: CommercialDocumentLineResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommercialDocumentLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'company_id'               => $this->company_id,
            'commercial_document_id'   => $this->commercial_document_id,
            'product_id'               => $this->product_id,
            'line_order'               => $this->line_order,
            'description'              => $this->description,
            'quantity'                 => $this->quantity,
            'delivered_quantity'       => $this->delivered_quantity,
            'returned_quantity'        => $this->returned_quantity,
            'unit_price_ht'            => $this->unit_price_ht,
            'discount_percentage'      => $this->discount_percentage,
            'discount_amount'          => $this->discount_amount,
            'tva_rate'                 => $this->tva_rate,
            'total_ht'                 => $this->total_ht,
            'total_tva'                => $this->total_tva,
            'total_ttc'                => $this->total_ttc,
            'additional_costs'         => $this->additional_costs,
            'total_additional_cost'    => $this->total_additional_cost,
            'total_discount_amount'    => $this->total_discount_amount,
            'stock_lot_id'             => $this->stock_lot_id,
            'is_auto_split'            => $this->is_auto_split,
            'parent_line_id'           => $this->parent_line_id,
            'line_attributes'          => $this->line_attributes,
            'created_at'               => $this->created_at,
            'updated_at'               => $this->updated_at,

            // Relations
            'product'                  => new ProductResource($this->whenLoaded('product')),
            'stock_lot'                => new ProductLotResource($this->whenLoaded('stockLot')),
        ];
    }
}




// ===== ملف: CommercialDocumentResource.php =====
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
            'is_proforma'                  => $this->is_proforma,
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
        ];
    }
}




// ===== ملف: CommuneResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'post_code'   => $this->post_code,
            'name'        => $this->name,
            'arabic_name' => $this->arabic_name,
            'wilaya_id'   => $this->wilaya_id,
            'latitude'    => $this->latitude,
            'longitude'   => $this->longitude,
            'active'      => $this->active,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,

            // Relations
            'wilaya'      => new WilayaResource($this->whenLoaded('wilaya')),
        ];
    }
}




// ===== ملف: CompanyResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'commercial_name'     => $this->commercial_name,
            'slug'                => $this->slug,
            'activity'            => $this->activity,
            'rc'                  => $this->rc,
            'nif'                 => $this->nif,
            'nis'                 => $this->nis,
            'ai'                  => $this->ai,
            'legal_form_id'       => $this->legal_form_id,
            'capital_amount'      => $this->capital_amount,
            'rc_date'             => $this->rc_date,
            'address'             => $this->address,
            'commune_id'          => $this->commune_id,
            'wilaya_id'           => $this->wilaya_id,
            'phone'               => $this->phone,
            'mobile'              => $this->mobile,
            'fax'                 => $this->fax,
            'email'               => $this->email,
            'avatar'              => $this->avatar,
            'bank_name'           => $this->bank_name,
            'rib'                 => $this->rib,
            'owner_id'            => $this->owner_id,
            'active'              => $this->active,
            'plan'                => $this->plan,
            'trial_ends_at'       => $this->trial_ends_at,
            'max_users'           => $this->max_users,
            'max_warehouses'      => $this->max_warehouses,
            'max_products'        => $this->max_products,
            'verified_at'         => $this->verified_at,
            'suspended_at'        => $this->suspended_at,
            'suspension_reason'   => $this->suspension_reason,
            'deactivated_at'      => $this->deactivated_at,
            'notes'               => $this->notes,
            'settings_json'       => $this->settings_json,
            'created_by'          => $this->created_by,
            'updated_by'          => $this->updated_by,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'legal_form'          => new LegalFormResource($this->whenLoaded('legalForm')),
            'commune'             => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'              => new WilayaResource($this->whenLoaded('wilaya')),
            'owner'               => new UserResource($this->whenLoaded('owner')),
        ];
    }
}




// ===== ملف: CompanyUserResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'company'     => new CompanyResource($this->whenLoaded('company')),
            'user_id'     => $this->user_id,
            'user'        => new UserResource($this->whenLoaded('user')),
            'role'        => $this->role,
            'is_default'  => $this->is_default,
            'active'      => $this->active,
            'invited_by'  => $this->invited_by,
            'inviter'     => new UserResource($this->whenLoaded('inviter')),
            'joined_at'   => $this->joined_at?->toDateTimeString(),
            'created_at'  => $this->created_at?->toDateTimeString(),
            'updated_at'  => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: CurrencyResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrencyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'company_id'       => $this->company_id,
            'name'             => $this->name,
            'code'             => $this->code,
            'symbol'           => $this->symbol,
            'decimal_places'   => $this->decimal_places,
            'is_base_currency' => $this->is_base_currency,
            'active'           => $this->active,
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}




// ===== ملف: DocumentBaseOperationResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentBaseOperationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'label'         => $this->label,
            'description'   => $this->description,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: DocumentStatusResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentStatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'company_id' => $this->company_id,
            'name'       => $this->name,
            'label'      => $this->label,
            'color'      => $this->color,
            'active'     => $this->active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}




// ===== ملف: DocumentTypeResource.php =====
// app/Http/Resources/DocumentTypeResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                         => $this->id,
            'company_id'                 => $this->company_id,
            'name'                       => $this->name,
            'name_latin'                 => $this->name_latin,
            'code'                       => $this->code,
            'description'                => $this->description,
            'document_base_operation_id' => $this->document_base_operation_id,
            'affects_stock_direction'    => $this->affects_stock_direction,
            'requires_party'             => $this->requires_party,
            'affects_accounting'         => $this->affects_accounting,
            'is_printable'               => $this->is_printable,
            'print_template'             => $this->print_template,
            'active'                     => $this->active,
            'display_order'              => $this->display_order,
            'created_at'                 => $this->created_at,
            'updated_at'                 => $this->updated_at,

            // Relations
            'document_base_operation'    => new DocumentBaseOperationResource($this->whenLoaded('documentBaseOperation')),
        ];
    }
}



// ===== ملف: EmployeeResource.php =====
// app/Http/Resources/EmployeeResource.php (علاقات مسطحة)
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'matricule'         => $this->matricule,
            'user_id'           => $this->user_id,
            'first_name'        => $this->first_name,
            'last_name'         => $this->last_name,
            'full_name'         => $this->full_name,
            'nss'               => $this->nss,
            'birth_date'        => $this->birth_date?->toIso8601String(),
            'gender_id'         => $this->gender_id,
            'rib'               => $this->rib,
            'bank_name'         => $this->bank_name,
            'hire_date'         => $this->hire_date?->toIso8601String(),
            'termination_date'  => $this->termination_date?->toIso8601String(),
            'active'            => $this->active,
            'employment_status' => $this->employment_status,
            'created_by'        => $this->created_by,
            'updated_by'        => $this->updated_by,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
            'deleted_at'        => $this->deleted_at?->toIso8601String(),

            // علاقات مسطحة
            'user'              => new UserResource($this->whenLoaded('user')),
            'gender'            => new GenderResource($this->whenLoaded('gender')),
            'contracts'         => EmploymentContractResource::collection($this->whenLoaded('contracts')),
        ];
    }
}



// ===== ملف: EmploymentContractResource.php =====
// app/Http/Resources/EmploymentContractResource.php (علاقات مسطحة)
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmploymentContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'employee_id'     => $this->employee_id,
            'contract_type'   => $this->contract_type,
            'start_date'      => $this->start_date?->toIso8601String(),
            'end_date'        => $this->end_date?->toIso8601String(),
            'base_salary'     => $this->base_salary,
            'job_title'       => $this->job_title,
            'department'      => $this->department,
            'active'          => $this->active,
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),

            // علاقة مسطحة
            'employee'        => new EmployeeResource($this->whenLoaded('employee')),
        ];
    }
}



// ===== ملف: ExchangeRateResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExchangeRateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'company_id'       => $this->company_id,
            'from_currency_id' => $this->from_currency_id,
            'from_currency'    => new CurrencyResource($this->whenLoaded('fromCurrency')),
            'to_currency_id'   => $this->to_currency_id,
            'to_currency'      => new CurrencyResource($this->whenLoaded('toCurrency')),
            'rate'             => $this->rate,
            'rate_date'        => $this->rate_date?->toDateString(),
            'created_at'       => $this->created_at?->toDateTimeString(),
            'updated_at'       => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: ExpenseCategoryResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'code'          => $this->code,
            'description'   => $this->description,
            'parent_id'     => $this->parent_id,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_by'    => $this->created_by,
            'updated_by'    => $this->updated_by,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
            'deleted_at'    => $this->deleted_at,

            // Relations
            'parent'        => new ExpenseCategoryResource($this->whenLoaded('parent')),
            'children'      => ExpenseCategoryResource::collection($this->whenLoaded('children')),
        ];
    }
}




// ===== ملف: ExpenseResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'company_id'            => $this->company_id,
            'expense_number'        => $this->expense_number,
            'date'                  => $this->date,
            'amount'                => $this->amount,
            'expense_category_id'   => $this->expense_category_id,
            'fiscal_year_id'        => $this->fiscal_year_id,
            'payment_mode_id'       => $this->payment_mode_id,
            'treasury_account_id'   => $this->treasury_account_id,
            'party_id'              => $this->party_id,
            'description'           => $this->description,
            'reference'             => $this->reference,
            'has_attachments'       => $this->has_attachments,
            'status'                => $this->status,
            'is_paid'               => $this->is_paid,
            'is_recurring'          => $this->is_recurring,
            'created_by'            => $this->created_by,
            'updated_by'            => $this->updated_by,
            'created_at'            => $this->created_at,
            'updated_at'            => $this->updated_at,
            'deleted_at'            => $this->deleted_at,

            // Relations
            'expense_category'      => new ExpenseCategoryResource($this->whenLoaded('expenseCategory')),
            'fiscal_year'           => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'payment_mode'          => new PaymentModeResource($this->whenLoaded('paymentMode')),
            'treasury_account'      => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
            'party'                 => new PartyResource($this->whenLoaded('party')),
        ];
    }
}




// ===== ملف: FamilyResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'description'   => $this->description,
            'parent_id'     => $this->parent_id,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_by'    => $this->created_by,
            'updated_by'    => $this->updated_by,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
            'deleted_at'    => $this->deleted_at,

            // Relations
            'parent'        => new FamilyResource($this->whenLoaded('parent')),
            'children'      => FamilyResource::collection($this->whenLoaded('children')),
        ];
    }
}




// ===== ملف: FiscalStampResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FiscalStampResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'name'        => $this->name,
            'min_amount'  => $this->min_amount,
            'max_amount'  => $this->max_amount,
            'stamp_value' => $this->stamp_value,
            'type'        => $this->type,
            'active'      => $this->active,
            'valid_from'  => $this->valid_from,
            'valid_to'    => $this->valid_to,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}




// ===== ملف: FiscalYearResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'start_date'    => $this->start_date,
            'end_date'      => $this->end_date,
            'is_closed'     => $this->is_closed,
            'closed_at'     => $this->closed_at,
            'closed_by'     => $this->closed_by,
            'is_current'    => $this->is_current,
            'closing_notes' => $this->closing_notes,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: GenderResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GenderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'label'         => $this->label,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: InventoryValuationMethodResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryValuationMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'company_id' => $this->company_id,
            'name'       => $this->name,
            'method'     => $this->method,
            'is_default' => $this->is_default,
            'active'     => $this->active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}




// ===== ملف: LegalFormResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LegalFormResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'company_id'        => $this->company_id,
            'code'              => $this->code,
            'name'              => $this->name,
            'description'       => $this->description,
            'requires_capital'  => $this->requires_capital,
            'active'            => $this->active,
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}




// ===== ملف: NotificationResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'type'            => $this->type,
            'company_id'      => $this->company_id,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id'   => $this->notifiable_id,
            'data'            => $this->data,
            'read_at'         => $this->read_at?->toDateTimeString(),
            'is_read'         => ! is_null($this->read_at),
            'created_at'      => $this->created_at?->toDateTimeString(),
            'updated_at'      => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: NumberingSeriesResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NumberingSeriesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'document_type_id'   => $this->document_type_id,
            'warehouse_id'       => $this->warehouse_id,
            'prefix'             => $this->prefix,
            'suffix'             => $this->suffix,
            'format'             => $this->format,
            'last_number'        => $this->last_number,
            'padding'            => $this->padding,
            'start_number'       => $this->start_number,
            'max_number'         => $this->max_number,
            'reset_yearly'       => $this->reset_yearly,
            'reset_monthly'      => $this->reset_monthly,
            'current_year'       => $this->current_year,
            'current_month'      => $this->current_month,
            'reset_date'         => $this->reset_date,
            'active'             => $this->active,
            'is_locked'          => $this->is_locked,
            'created_at'         => $this->created_at,
            'updated_at'         => $this->updated_at,

            // Relations
            'document_type'      => new DocumentTypeResource($this->whenLoaded('documentType')),
            'warehouse'          => new WarehouseResource($this->whenLoaded('warehouse')),
        ];
    }
}




// ===== ملف: OpeningBalancePartyResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalancePartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'fiscal_year_id'  => $this->fiscal_year_id,
            'fiscal_year'     => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'party_id'        => $this->party_id,
            'party'           => new PartyResource($this->whenLoaded('party')),
            'opening_balance' => $this->opening_balance,
            'balance_type'    => $this->balance_type, // debit | credit
            'created_at'      => $this->created_at?->toDateTimeString(),
            'updated_at'      => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: OpeningBalanceStockResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpeningBalanceStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'fiscal_year_id'     => $this->fiscal_year_id,
            'fiscal_year'        => new FiscalYearResource($this->whenLoaded('fiscalYear')),
            'product_id'         => $this->product_id,
            'product'            => new ProductResource($this->whenLoaded('product')),
            'warehouse_id'       => $this->warehouse_id,
            'warehouse'          => new WarehouseResource($this->whenLoaded('warehouse')),
            'opening_quantity'   => $this->opening_quantity,
            'opening_value'      => $this->opening_value,
            'lot_number'         => $this->lot_number,
            'manufacturing_date' => $this->manufacturing_date?->toDateString(),
            'expiration_date'    => $this->expiration_date?->toDateString(),
            'created_at'         => $this->created_at?->toDateTimeString(),
            'updated_at'         => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: PartyResource.php =====
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




// ===== ملف: PartyTypeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartyTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'label'         => $this->label,
            'description'   => $this->description,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: PaymentModeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentModeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'company_id'           => $this->company_id,
            'name'                 => $this->name,
            'code'                 => $this->code,
            'description'          => $this->description,
            'treasury_account_id'  => $this->treasury_account_id,
            'requires_reference'   => $this->requires_reference,
            'is_cash'              => $this->is_cash,
            'active'               => $this->active,
            'display_order'        => $this->display_order,
            'created_at'           => $this->created_at,
            'updated_at'           => $this->updated_at,

            // Relations
            'treasury_account'     => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
        ];
    }
}




// ===== ملف: PaymentResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'payment_number'      => $this->payment_number,
            'payment_date'        => $this->payment_date,
            'amount'              => $this->amount,
            'currency_id'         => $this->currency_id,
            'amount_local'        => $this->amount_local,
            'payment_mode_id'     => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'check_id'            => $this->check_id,
            'party_id'            => $this->party_id,
            'fiscal_year_id'      => $this->fiscal_year_id,
            'reference'           => $this->reference,
            'bank_reference'      => $this->bank_reference,
            'notes'               => $this->notes,
            'status'              => $this->status,
            'is_reconciled'       => $this->is_reconciled,
            'reconciliation_date' => $this->reconciliation_date,
            'clearing_date'       => $this->clearing_date,
            'user_id'             => $this->user_id,
            'created_by'          => $this->created_by,
            'updated_by'          => $this->updated_by,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'party'               => new PartyResource($this->whenLoaded('party')),
            'payment_mode'        => new PaymentModeResource($this->whenLoaded('paymentMode')),
            'treasury_account'    => new TreasuryAccountResource($this->whenLoaded('treasuryAccount')),
            'currency'            => new CurrencyResource($this->whenLoaded('currency')),
            'check'               => new CheckResource($this->whenLoaded('check')),
            'fiscal_year'         => new FiscalYearResource($this->whenLoaded('fiscalYear')),
        ];
    }
}




// ===== ملف: PermissionResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * PermissionResource
 */
class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'display_name' => $this->display_name,
            'group'        => $this->group,
            'description'  => $this->description,
            'guard_name'   => $this->guard_name,
            'company_id'   => $this->company_id,
        ];
    }
}




// ===== ملف: PriceLevelResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PriceLevelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'description'   => $this->description,
            'is_default'    => $this->is_default,
            'is_percentage' => $this->is_percentage,
            'value'         => $this->value,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: ProductLotResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductLotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'company_id'          => $this->company_id,
            'lot_number'          => $this->lot_number,
            'product_id'          => $this->product_id,
            'warehouse_id'        => $this->warehouse_id,
            'manufacturing_date'  => $this->manufacturing_date,
            'expiration_date'     => $this->expiration_date,
            'purchase_date'       => $this->purchase_date,
            'purchase_price'      => $this->purchase_price,
            'legal_selling_price' => $this->legal_selling_price,
            'margin_percentage'   => $this->margin_percentage,
            'original_quantity'   => $this->original_quantity,
            'remaining_quantity'  => $this->remaining_quantity,
            'is_depleted'         => $this->is_depleted,
            'total_cost'          => $this->total_cost,
            'remaining_value'     => $this->remaining_value,
            'stock_movement_id'   => $this->stock_movement_id,
            'supplier_lot_number' => $this->supplier_lot_number,
            'active'              => $this->active,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
            'deleted_at'          => $this->deleted_at,

            // Relations
            'product'             => new ProductResource($this->whenLoaded('product')),
            'warehouse'           => new WarehouseResource($this->whenLoaded('warehouse')),
        ];
    }
}




// ===== ملف: ProductPackagingResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductPackagingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'product_id'    => $this->product_id,
            'code'          => $this->code,
            'label'         => $this->label,
            'quantity'      => $this->quantity,
            'barcode'       => $this->barcode,
            'is_default'    => $this->is_default,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: ProductPriceResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'product_id'      => $this->product_id,
            'price_level_id'  => $this->price_level_id,
            'pricing_method'  => $this->pricing_method,
            'price'           => $this->price,
            'rate'            => $this->rate,
            'margin'          => $this->margin,
            'active'          => $this->active,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,

            // Relations
            'price_level'     => new PriceLevelResource($this->whenLoaded('priceLevel')),
        ];
    }
}




// ===== ملف: ProductResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                        => $this->id,
            'company_id'                => $this->company_id,
            'name'                      => $this->name,
            'slug'                      => $this->slug,
            'ref'                       => $this->ref,
            'barcode'                   => $this->barcode,
            'description'               => $this->description,
            'family_id'                 => $this->family_id,
            'brand_id'                  => $this->brand_id,
            'product_type_id'           => $this->product_type_id,
            'tva_id'                    => $this->tva_id,
            'unit_id'                   => $this->unit_id,
            'purchase_price_ht'         => $this->purchase_price_ht,
            'current_cost_price'        => $this->current_cost_price,
            'manages_stock'             => $this->manages_stock,
            'allow_negative_stock'      => $this->allow_negative_stock,
            'has_lots'                  => $this->has_lots,
            'has_expiration_date'       => $this->has_expiration_date,
            'min_stock_alert'           => $this->min_stock_alert,
            'max_stock_alert'           => $this->max_stock_alert,
            'manages_quantity_discounts'=> $this->manages_quantity_discounts,
            'weight'                    => $this->weight,
            'volume'                    => $this->volume,
            'length'                    => $this->length,
            'width'                     => $this->width,
            'height'                    => $this->height,
            'valuation_method_id'       => $this->valuation_method_id,
            'specifications'            => $this->specifications,
            'images'                    => $this->images,
            'meta_title'                => $this->meta_title,
            'meta_description'          => $this->meta_description,
            'meta_keywords'             => $this->meta_keywords,
            'active'                    => $this->active,
            'created_by'                => $this->created_by,
            'updated_by'                => $this->updated_by,
            'created_at'                => $this->created_at,
            'updated_at'                => $this->updated_at,
            'deleted_at'                => $this->deleted_at,

            // Relations
            'family'                    => new FamilyResource($this->whenLoaded('family')),
            'brand'                     => new BrandResource($this->whenLoaded('brand')),
            'product_type'              => new ProductTypeResource($this->whenLoaded('productType')),
            'tva'                       => new TvaResource($this->whenLoaded('tva')),
            'unit'                      => new UnitResource($this->whenLoaded('unit')),
            'valuation_method'          => new InventoryValuationMethodResource($this->whenLoaded('valuationMethod')),
            'prices'                    => ProductPriceResource::collection($this->whenLoaded('prices')),
            'packagings'                => ProductPackagingResource::collection($this->whenLoaded('packagings')),
            'variants'                  => ProductVariantResource::collection($this->whenLoaded('variants')),
            'barcodes'                  => BarcodeResource::collection($this->whenLoaded('barcodes')),
        ];
    }
}




// ===== ملف: ProductTypeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'company_id'     => $this->company_id,
            'name'           => $this->name,
            'label'          => $this->label,
            'description'    => $this->description,
            'manages_stock'  => $this->manages_stock,
            'active'         => $this->active,
            'display_order'  => $this->display_order,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}




// ===== ملف: ProductVariantResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'company_id'   => $this->company_id,
            'product_id'   => $this->product_id,
            'sku'          => $this->sku,
            'barcode'      => $this->barcode,
            'price_type'   => $this->price_type,
            'price_value'  => $this->price_value,
            'stock'        => $this->stock,
            'track_stock'  => $this->track_stock,
            'attributes'   => $this->attributes,
            'image'        => $this->image,
            'weight'       => $this->weight,
            'volume'       => $this->volume,
            'active'       => $this->active,
            'created_by'   => $this->created_by,
            'updated_by'   => $this->updated_by,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
            'deleted_at'   => $this->deleted_at,

            // Relations
            'product'      => new ProductResource($this->whenLoaded('product')),
        ];
    }
}




// ===== ملف: QuantityDiscountResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuantityDiscountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'company_id'         => $this->company_id,
            'product_id'         => $this->product_id,
            'price_level_id'     => $this->price_level_id,
            'min_qty'            => $this->min_qty,
            'max_qty'            => $this->max_qty,
            'discount_amount'    => $this->discount_amount,
            'discount_percentage'=> $this->discount_percentage,
            'tier_order'         => $this->tier_order,
            'is_blocked'         => $this->is_blocked,
            'active'             => $this->active,
            'created_at'         => $this->created_at,
            'updated_at'         => $this->updated_at,

            // Relations
            'price_level'        => new PriceLevelResource($this->whenLoaded('priceLevel')),
            'product'            => new ProductResource($this->whenLoaded('product')),
        ];
    }
}




// ===== ملف: RoleResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * RoleResource
 *
 * يُحوّل Role model إلى JSON موحّد للفرونت إند.
 * يدعم:
 *   - permissions كـ PermissionResource collection
 *   - users_count إذا كان محمَّلاً
 */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'display_name' => $this->display_name,
            'description'  => $this->description,
            'guard_name'   => $this->guard_name,
            'company_id'   => $this->company_id,

            // ✅ permissions — دائماً array (ليس null)
            'permissions'  => $this->whenLoaded(
                'permissions',
                fn() => PermissionResource::collection($this->permissions),
                []
            ),

            // ✅ users_count — اختياري، يظهر فقط إذا كان محمَّلاً
            'users_count'  => $this->when(
                isset($this->users_count),
                $this->users_count
            ),

            'roles' => $this->whenLoaded('roles', function () {
                // ✅ إذا كانت roles فارغة، ابحث عن super-admin
                $roles = $this->resource->roles;

                if ($roles->isEmpty()) {
                    // المالك قد يكون super-admin بدون company_id
                    $superAdmin = $this->resource->roles()->whereNull('company_id')->get();
                    if ($superAdmin->isNotEmpty()) {
                        return RoleResource::collection($superAdmin);
                    }

                    // أو تحقق من company_user pivot
                    // إذا كان owner_id = $this->id في جدول companies
                    $companyId = app(\App\Services\CompanyContextService::class)->get();
                    if ($companyId) {
                        $company = \App\Models\Company::find($companyId);
                        if ($company && $company->owner_id === $this->resource->id) {
                            // هذا المالك — أضف label مخصص
                            return [['id' => 0, 'name' => 'owner', 'display_name' => 'المالك', 'permissions' => []]];
                        }
                    }
                }

                return RoleResource::collection($roles);
            }),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}




// ===== ملف: SettingResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'key'           => $this->key,
            'group'         => $this->group,
            'value'         => $this->value,
            'type'          => $this->type,
            'description'   => $this->description,
            'is_public'     => $this->is_public,
            'is_editable'   => $this->is_editable,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at?->toDateTimeString(),
            'updated_at'    => $this->updated_at?->toDateTimeString(),
        ];
    }
}




// ===== ملف: StockMovementResource.php =====
// app/Http/Resources/StockMovementResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'company_id'                  => $this->company_id,
            'product_id'                  => $this->product_id,
            'warehouse_id'                => $this->warehouse_id,
            'packaging_id'                => $this->packaging_id,
            'fiscal_year_id'              => $this->fiscal_year_id,
            'stock_movement_type_id'      => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id,
            'movement_date'               => $this->movement_date,
            'quantity'                    => $this->quantity,
            'packaging_quantity'          => $this->packaging_quantity,
            'unit_price'                  => $this->unit_price,
            'cost_price'                  => $this->cost_price,
            'total_price'                 => $this->total_price,
            'price_source'                => $this->price_source,
            'stock_balance_after'         => $this->stock_balance_after,
            'lot_number'                  => $this->lot_number,
            'expiration_date'             => $this->expiration_date,
            'stock_lot_id'                => $this->stock_lot_id,
            'reason'                      => $this->reason,
            'notes'                       => $this->notes,
            'user_id'                     => $this->user_id,
            'parent_movement_id'          => $this->parent_movement_id,
            'is_validated'                => $this->is_validated,
            'validated_by'                => $this->validated_by,
            'validated_at'                => $this->validated_at,
            'created_by'                  => $this->created_by,
            'created_at'                  => $this->created_at,
            'updated_at'                  => $this->updated_at,
            'deleted_at'                  => $this->deleted_at,

            // Relations (تم تصحيح اسم العلاقة)
            'product'                     => new ProductResource($this->whenLoaded('product')),
            'warehouse'                   => new WarehouseResource($this->whenLoaded('warehouse')),
            'stock_movement_type'         => new StockMovementTypeResource($this->whenLoaded('stockMovementType')),
            'stock_lot'                   => new ProductLotResource($this->whenLoaded('stockLot')),
            'packaging'                   => new ProductPackagingResource($this->whenLoaded('packaging')),
        ];
    }
}



// ===== ملف: StockMovementTypeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'label'         => $this->label,
            'description'   => $this->description,
            'direction'     => $this->direction,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: TreasuryAccountResource.php =====
// app/Http/Resources/TreasuryAccountResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'company_id'              => $this->company_id,
            'name'                    => $this->name,
            'code'                    => $this->code,
            'treasury_account_type_id'=> $this->treasury_account_type_id,
            'bank_name'               => $this->bank_name,
            'account_number'          => $this->account_number,
            'rib'                     => $this->rib,
            'iban'                    => $this->iban,
            'swift_bic'               => $this->swift_bic,
            'currency_id'             => $this->currency_id,
            'initial_balance'         => $this->initial_balance,
            'current_balance'         => $this->current_balance,
            'is_default'              => $this->is_default,
            'active'                  => $this->active,
            'notes'                   => $this->notes,
            'created_by'              => $this->created_by,
            'updated_by'              => $this->updated_by,
            'created_at'              => $this->created_at,
            'updated_at'              => $this->updated_at,
            'deleted_at'              => $this->deleted_at,

            // Relations (تم تصحيح اسم العلاقة)
            'treasury_account_type'   => new TreasuryAccountTypeResource($this->whenLoaded('treasuryAccountType')),
            'currency'                => new CurrencyResource($this->whenLoaded('currency')),
        ];
    }
}



// ===== ملف: TreasuryAccountTypeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryAccountTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'label'         => $this->label,
            'description'   => $this->description,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: TvaResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TvaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'rate'          => $this->rate,
            'description'   => $this->description,
            'active'        => $this->active,
            'is_default'    => $this->is_default,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: UnitResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'company_id'    => $this->company_id,
            'name'          => $this->name,
            'symbol'        => $this->symbol,
            'description'   => $this->description,
            'active'        => $this->active,
            'display_order' => $this->display_order,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}




// ===== ملف: UserResource.php =====
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

            // ── Relations ────────────────────────────────────────────
            'gender'  => new GenderResource($this->whenLoaded('gender')),
            'commune' => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'  => new WilayaResource($this->whenLoaded('wilaya')),

            // ✅ roles — unique() لمنع التكرار + display_name
            'roles' => $this->whenLoaded(
                'roles',
                fn () => $this->roles->unique('id')->map(fn ($r) => [
                    'id'           => $r->id,
                    'name'         => $r->name,
                    'display_name' => $r->display_name ?? null,
                ]),
                []
            ),

            // ✅ permissions — unique() + group آمن بدون pivot
            // لا يوجد عمود group في جدول model_has_permissions
            // الـ Frontend يستخرج المجموعة من اسم الصلاحية تلقائياً
            'permissions' => $this->whenLoaded(
                'permissions',
                fn () => $this->permissions->unique('id')->map(fn ($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name ?? null,
                    'group'        => $p->group ?? null, // عمود مباشر في جدول permissions (إن وُجد)
                ]),
                []
            ),
        ];
    }
}




// ===== ملف: WarehouseResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'company_id'   => $this->company_id,
            'name'         => $this->name,
            'code'         => $this->code,
            'address'      => $this->address,
            'commune_id'   => $this->commune_id,
            'wilaya_id'    => $this->wilaya_id,
            'phone'        => $this->phone,
            'manager_name' => $this->manager_name,
            'activity'     => $this->activity,
            'rc'           => $this->rc,
            'nif'          => $this->nif,
            'nis'          => $this->nis,
            'ai'           => $this->ai,
            'active'       => $this->active,
            'created_by'   => $this->created_by,
            'updated_by'   => $this->updated_by,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
            'deleted_at'   => $this->deleted_at,

            // Relations
            'commune'      => new CommuneResource($this->whenLoaded('commune')),
            'wilaya'       => new WilayaResource($this->whenLoaded('wilaya')),
        ];
    }
}




// ===== ملف: WilayaResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WilayaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'code'        => $this->code,
            'name'        => $this->name,
            'arabic_name' => $this->arabic_name,
            'latitude'    => $this->latitude,
            'longitude'   => $this->longitude,
            'active'      => $this->active,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,

            // Relations
            'communes'    => CommuneResource::collection($this->whenLoaded('communes')),
        ];
    }
}


