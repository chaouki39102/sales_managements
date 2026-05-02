<?php

// دمج تلقائي لكل ملفات الـ Resources



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
            'id' => $this->id,
            'file_name' => $this->file_name,
            'file_path' => $this->file_path,
            'file_type' => $this->file_type,
            'file_extension' => $this->file_extension,
            'file_size' => $this->file_size,
            'attachable_type' => $this->attachable_type,
            'attachable_id' => $this->attachable_id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'is_public' => $this->is_public,
            'disk' => $this->disk,
            'uploaded_by' => $this->uploaded_by,
            'url' => $this->url,
            'download_url' => $this->download_url,
            'file_size_formatted' => $this->file_size_formatted,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'uploadedBy' => $this->whenLoaded('uploadedBy', fn() => [
                    'id' => $this->uploadedBy->id,
                    'name' => $this->uploadedBy->name,
                    'email' => $this->uploadedBy->email,
                ]),
            ],
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
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_type' => $this->user_type,
            'event' => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'url' => $this->url,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'tags' => $this->tags,
            'created_at' => $this->created_at?->toIso8601String(),
            
            'relations' => [
                'user' => $this->whenLoaded('user', fn() => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ]),
            ],
        ];
    }
}



// ===== ملف: AuthResource.php =====
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




// ===== ملف: BarcodeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BarcodeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request);
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
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo' => $this->logo,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'check_number' => $this->check_number,
            'check_date' => $this->check_date?->toIso8601String(),
            'due_date' => $this->due_date?->toIso8601String(),
            'amount' => $this->amount,
            'bank_name' => $this->bank_name,
            'account_number' => $this->account_number,
            'drawer_name' => $this->drawer_name,
            'party_id' => $this->party_id,
            'status' => $this->status,
            'cleared_date' => $this->cleared_date?->toIso8601String(),
            'bounce_reason' => $this->bounce_reason,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            'is_overdue' => $this->is_overdue,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                ]),
                'payments' => $this->whenLoaded('payments', fn() => 
                    $this->payments->map(fn($p) => [
                        'id' => $p->id,
                        'payment_number' => $p->payment_number,
                        'amount' => $p->amount,
                    ])
                ),
            ],
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
            'id' => $this->id,
            'commercial_document_id' => $this->commercial_document_id,
            'product_id' => $this->product_id,
            'line_order' => $this->line_order,
            'description' => $this->description,
            'quantity' => $this->quantity,
            'delivered_quantity' => $this->delivered_quantity,
            'returned_quantity' => $this->returned_quantity,
            'unit_price_ht' => $this->unit_price_ht,
            'discount_percentage' => $this->discount_percentage,
            'discount_amount' => $this->discount_amount,
            'additional_costs' => $this->additional_costs,
            'total_additional_cost' => $this->total_additional_cost,
            'total_discount_amount' => $this->total_discount_amount,
            'tva_rate' => $this->tva_rate,
            'total_ht' => $this->total_ht,
            'total_tva' => $this->total_tva,
            'total_ttc' => $this->total_ttc,
            'stock_lot_id' => $this->stock_lot_id,
            'is_auto_split' => $this->is_auto_split,
            'parent_line_id' => $this->parent_line_id,
            'line_attributes' => $this->line_attributes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'commercialDocument' => $this->whenLoaded('commercialDocument', fn() => [
                    'id' => $this->commercialDocument->id,
                    'document_number' => $this->commercialDocument->document_number,
                ]),
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'stockLot' => $this->whenLoaded('stockLot', fn() => [
                    'id' => $this->stockLot->id,
                    'lot_number' => $this->stockLot->lot_number,
                ]),
            ],

            'computed' => [
                'remaining_quantity' => $this->getRemainingQuantity(),
                'is_fully_delivered' => $this->isFullyDelivered(),
                'has_discount' => $this->hasDiscount(),
            ],
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
                        'product_id' => $line->product_id,
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
                        'product' => $line->whenLoaded('product', fn() => [
                            'id' => $line->product->id,
                            'name' => $line->product->name,
                            'ref' => $line->product->ref,
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




// ===== ملف: CommuneResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommuneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'post_code' => $this->post_code,
            'name' => $this->name,
            'arabic_name' => $this->arabic_name,
            'wilaya_id' => $this->wilaya_id,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'wilaya' => $this->whenLoaded('wilaya', fn() => [
                    'id' => $this->wilaya->id,
                    'code' => $this->wilaya->code,
                    'name' => $this->wilaya->name,
                ]),
            ],
        ];
    }
}




// ===== ملف: CompanyResource.php =====
// app/Http/Resources/CompanyResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'commercial_name' => $this->commercial_name,
            'slug'            => $this->slug,
            'email'           => $this->email,
            'phone'           => $this->phone,
            'address'         => $this->address,
            'nif'             => $this->nif,
            'nis'             => $this->nis,
            'rc'              => $this->rc,
            'legal_form_id'   => $this->legal_form_id,
            'wilaya_id'       => $this->wilaya_id,
            'commune_id'      => $this->commune_id,
            'owner_id'        => $this->owner_id,
            'is_active'       => (bool) $this->is_active,
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'symbol' => $this->symbol,
            'decimal_places' => $this->decimal_places,
            'is_base_currency' => $this->is_base_currency,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'color' => $this->color,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}



// ===== ملف: DocumentTypeResource.php =====
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




// ===== ملف: EmployeeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'matricule' => $this->matricule,
            'user_id' => $this->user_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'nss' => $this->nss,
            'birth_date' => $this->birth_date?->toIso8601String(),
            'gender_id' => $this->gender_id,
            'rib' => $this->rib,
            'bank_name' => $this->bank_name,
            'hire_date' => $this->hire_date?->toIso8601String(),
            'termination_date' => $this->termination_date?->toIso8601String(),
            'employment_status' => $this->employment_status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'user' => $this->whenLoaded('user', fn() => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ]),
                'gender' => $this->whenLoaded('gender', fn() => [
                    'id' => $this->gender->id,
                    'name' => $this->gender->name,
                ]),
                'contracts' => $this->whenLoaded('contracts', fn() => 
                    $this->contracts->map(fn($c) => [
                        'id' => $c->id,
                        'contract_type' => $c->contract_type,
                        'job_title' => $c->job_title,
                        'is_active' => $c->is_active,
                    ])
                ),
            ],
        ];
    }
}



// ===== ملف: EmploymentContractResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmploymentContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'contract_type' => $this->contract_type,
            'start_date' => $this->start_date?->toIso8601String(),
            'end_date' => $this->end_date?->toIso8601String(),
            'base_salary' => $this->base_salary,
            'job_title' => $this->job_title,
            'department' => $this->department,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'employee' => $this->whenLoaded('employee', fn() => [
                    'id' => $this->employee->id,
                    'first_name' => $this->employee->first_name,
                    'last_name' => $this->employee->last_name,
                    'full_name' => $this->employee->full_name,
                ]),
            ],
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
            'id' => $this->id,
            'from_currency_id' => $this->from_currency_id,
            'to_currency_id' => $this->to_currency_id,
            'rate' => $this->rate,
            'rate_date' => $this->rate_date?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'fromCurrency' => $this->whenLoaded('fromCurrency', fn() => [
                    'id' => $this->fromCurrency->id,
                    'code' => $this->fromCurrency->code,
                    'name' => $this->fromCurrency->name,
                ]),
                'toCurrency' => $this->whenLoaded('toCurrency', fn() => [
                    'id' => $this->toCurrency->id,
                    'code' => $this->toCurrency->code,
                    'name' => $this->toCurrency->name,
                ]),
            ],
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



// ===== ملف: ExpenseResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_number' => $this->expense_number,
            'date' => $this->date?->toIso8601String(),
            'amount' => $this->amount,
            'expense_category_id' => $this->expense_category_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'payment_mode_id' => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'party_id' => $this->party_id,
            'description' => $this->description,
            'reference' => $this->reference,
            'has_attachments' => $this->has_attachments,
            'status' => $this->status,
            'is_paid' => $this->is_paid,
            'is_recurring' => $this->is_recurring,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'expenseCategory' => $this->whenLoaded('expenseCategory', fn() => [
                    'id' => $this->expenseCategory->id,
                    'name' => $this->expenseCategory->name,
                ]),
                'paymentMode' => $this->whenLoaded('paymentMode', fn() => [
                    'id' => $this->paymentMode->id,
                    'name' => $this->paymentMode->name,
                ]),
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                ]),
            ],
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
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'min_amount' => $this->min_amount,
            'max_amount' => $this->max_amount,
            'stamp_duty' => $this->stamp_duty,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}




// ===== ملف: FiscalYearResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ✅ إنشاء: FiscalYearResource
 * الخطأ: Class "App\Http\Resources\FiscalYearResource" not found
 * الحل: إنشاء الملف في المسار الصحيح
 *       app/Http/Resources/FiscalYearResource.php
 */
class FiscalYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'start_date'   => $this->start_date?->toDateString(),
            'end_date'     => $this->end_date?->toDateString(),
            'is_closed'    => (bool) $this->is_closed,
            'is_current'   => (bool) $this->is_current,
            'closed_at'    => $this->closed_at?->toDateString(),
            'closed_by'    => $this->closed_by,
            // ✅ العلاقة: include=closedBy → يُحمَّل كـ closed_by_user
            'closed_by_user' => $this->whenLoaded('closedBy', function () {
                return [
                    'id'   => $this->closedBy->id,
                    'name' => $this->closedBy->name,
                ];
            }),
            'closing_notes' => $this->closing_notes,
            'created_at'   => $this->created_at?->toDateTimeString(),
            'updated_at'   => $this->updated_at?->toDateTimeString(),
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
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'type' => $this->type,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id' => $this->notifiable_id,
            'data' => $this->data,
            'is_unread' => $this->isUnread(),
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),

            'relations' => [
                'notifiable' => $this->whenLoaded('notifiable', fn() => [
                    'id' => $this->notifiable->id,
                    'name' => $this->notifiable->name ?? null,
                ]),
            ],
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
            'id' => $this->id,
            'document_type_id' => $this->document_type_id,
            'warehouse_id' => $this->warehouse_id,
            'prefix' => $this->prefix,
            'suffix' => $this->suffix,
            'format' => $this->format,
            'last_number' => $this->last_number,
            'padding' => $this->padding,
            'start_number' => $this->start_number,
            'max_number' => $this->max_number,
            'reset_yearly' => $this->reset_yearly,
            'reset_monthly' => $this->reset_monthly,
            'current_year' => $this->current_year,
            'current_month' => $this->current_month,
            'active' => $this->active,
            'is_locked' => $this->is_locked,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'documentType' => $this->whenLoaded('documentType', fn() => [
                    'id' => $this->documentType->id,
                    'name' => $this->documentType->name,
                    'code' => $this->documentType->code,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
            ],
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
            'id' => $this->id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'party_id' => $this->party_id,
            'opening_balance' => $this->opening_balance,
            'balance_type' => $this->balance_type,
            'is_debit' => $this->is_debit,
            'is_credit' => $this->is_credit,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'fiscalYear' => $this->whenLoaded('fiscalYear', fn() => [
                    'id' => $this->fiscalYear->id,
                    'name' => $this->fiscalYear->name,
                ]),
                'party' => $this->whenLoaded('party', fn() => [
                    'id' => $this->party->id,
                    'name' => $this->party->name,
                    'code' => $this->party->code,
                ]),
            ],
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
            'id' => $this->id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'opening_quantity' => $this->opening_quantity,
            'opening_value' => $this->opening_value,
            'average_cost_price' => $this->average_cost_price,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'fiscalYear' => $this->whenLoaded('fiscalYear', fn() => [
                    'id' => $this->fiscalYear->id,
                    'name' => $this->fiscalYear->name,
                ]),
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
            ],
        ];
    }
}




// ===== ملف: PartyResource.php =====
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



// ===== ملف: PartyTypeResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartyTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'treasury_account_id' => $this->treasury_account_id,
            'requires_reference' => $this->requires_reference,
            'is_cash' => $this->is_cash,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'treasuryAccount' => $this->whenLoaded('treasuryAccount', fn() => [
                    'id' => $this->treasuryAccount->id,
                    'name' => $this->treasuryAccount->name,
                    'code' => $this->treasuryAccount->code,
                ]),
            ],
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
            'id' => $this->id,
            'commercial_document_id' => $this->commercial_document_id,
            'amount' => $this->amount,
            'payment_date' => $this->payment_date?->toIso8601String(),
            'status' => $this->status,
            'payment_mode_id' => $this->payment_mode_id,
            'treasury_account_id' => $this->treasury_account_id,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}




// ===== ملف: PermissionResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'display_name' => $this->display_name,
            'group' => $this->group,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'roles' => $this->whenLoaded('roles', fn() => 
                    $this->roles->map(fn($r) => [
                        'id' => $r->id,
                        'name' => $r->name,
                        'display_name' => $r->display_name,
                    ])
                ),
            ],
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
            'id' => $this->id,
            'lot_number' => $this->lot_number,
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'manufacturing_date' => $this->manufacturing_date?->toIso8601String(),
            'expiration_date' => $this->expiration_date?->toIso8601String(),
            'purchase_date' => $this->purchase_date?->toIso8601String(),
            'purchase_price' => $this->purchase_price,
            'legal_selling_price' => $this->legal_selling_price,
            'margin_percentage' => $this->margin_percentage,
            'original_quantity' => $this->original_quantity,
            'remaining_quantity' => $this->remaining_quantity,
            'stock_movement_id' => $this->stock_movement_id,
            'supplier_lot_number' => $this->supplier_lot_number,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
            ],

            'computed' => [
                'is_depleted' => $this->is_depleted,
                'is_expired' => $this->is_expired,
                'total_cost' => $this->total_cost,
                'remaining_value' => $this->remaining_value,
                'is_expiring_soon' => $this->isExpiringSoon(),
            ],
        ];
    }
}




// ===== ملف: ProductResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ProductResource
 *
 * يعكس البنية الجديدة:
 * - لا products
 * - prices بدون price_computed (الحساب في الواجهة أو عند الطلب)
 * - packagings (Colisages)
 * - quantity_discounts مرتبطة بـ price_level
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $purchasePrice = (float) $this->purchase_price_ht;

        return [
            // ── المعلومات الأساسية ──
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'ref'         => $this->ref,
            'barcode'     => $this->barcode,
            'description' => $this->description,
            'images'      => $this->images ?? [],
            'active'      => (bool) $this->active,

            // ── التصنيف ──
            'family_id'       => $this->family_id,
            'brand_id'        => $this->brand_id,
            'product_type_id' => $this->product_type_id,

            // ── الضريبة والوحدة ──
            'tva_id'  => $this->tva_id,
            'unit_id' => $this->unit_id,

            // ── التسعير ──
            'purchase_price_ht' => $purchasePrice,

            // ── المخزون ──
            'manages_stock'              => (bool) $this->manages_stock,
            'allow_negative_stock'       => (bool) $this->allow_negative_stock,
            'has_lots'                   => (bool) $this->has_lots,
            'has_expiration_date'        => (bool) $this->has_expiration_date,
            'min_stock_alert'            => (float) $this->min_stock_alert,
            'max_stock_alert'            => (float) $this->max_stock_alert,
            'manages_quantity_discounts' => (bool) $this->manages_quantity_discounts,
            'valuation_method_id'        => $this->valuation_method_id,

            // ── مؤشرات المخزون (محسوبة) ──
            'current_stock' => (float) $this->current_stock,
            'is_low_stock'  => (bool)  $this->is_low_stock,

            // ── الأبعاد ──
            'weight' => $this->weight ? (float)$this->weight : null,
            'volume' => $this->volume ? (float)$this->volume : null,
            'length' => $this->length ? (float)$this->length : null,
            'width'  => $this->width  ? (float)$this->width  : null,
            'height' => $this->height ? (float)$this->height : null,

            // ── تواريخ ──
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            // ══════════════════════════════════════════════════
            // العلاقات (تُجلَب فقط إذا كانت محمّلة)
            // ══════════════════════════════════════════════════

            'family' => $this->whenLoaded('family', fn() => $this->family ? [
                'id' => $this->family->id, 'name' => $this->family->name,
            ] : null),

            'brand' => $this->whenLoaded('brand', fn() => $this->brand ? [
                'id' => $this->brand->id, 'name' => $this->brand->name,
            ] : null),

            'productType' => $this->whenLoaded('productType', fn() => $this->productType ? [
                'id'            => $this->productType->id,
                'name'          => $this->productType->name,
                'label'         => $this->productType->label,
                'manages_stock' => (bool)$this->productType->manages_stock,
            ] : null),

            'tva' => $this->whenLoaded('tva', fn() => $this->tva ? [
                'id' => $this->tva->id, 'rate' => (float)$this->tva->rate, 'name' => $this->tva->name,
            ] : null),

            'unit' => $this->whenLoaded('unit', fn() => $this->unit ? [
                'id' => $this->unit->id, 'name' => $this->unit->name, 'symbol' => $this->unit->symbol,
            ] : null),

            'valuationMethod' => $this->whenLoaded('valuationMethod', fn() => $this->valuationMethod ? [
                'id' => $this->valuationMethod->id, 'name' => $this->valuationMethod->name,
                'method' => $this->valuationMethod->method,
            ] : null),

            // ── وحدات التعبئة (Colisages) ──
            'packagings' => $this->whenLoaded('packagings', fn() =>
                $this->packagings->map(fn($p) => [
                    'id'            => $p->id,
                    'code'          => $p->code,
                    'label'         => $p->label,
                    'quantity'      => (float)$p->quantity,
                    'barcode'       => $p->barcode,
                    'is_default'    => (bool)$p->is_default,
                    'active'        => (bool)$p->active,
                    'display_order' => $p->display_order,
                ])->values()
            ),

            // ── التعريفات (Tarifs) ──
            // price_ht = السعر المحسوب من PHP (يُرسَل للواجهة جاهزاً)
            'prices' => $this->whenLoaded('prices', fn() =>
                $this->prices->map(fn($pp) => [
                    'id'             => $pp->id,
                    'price_level_id' => $pp->price_level_id,
                    'price_level'    => $pp->relationLoaded('priceLevel') && $pp->priceLevel ? [
                        'id'   => $pp->priceLevel->id,
                        'name' => $pp->priceLevel->name,
                    ] : null,
                    'pricing_method' => $pp->pricing_method,
                    // قيم الإدخال (للتعديل في الفورم)
                    'price'  => $pp->price  !== null ? (float)$pp->price  : null,
                    'rate'   => $pp->rate   !== null ? (float)$pp->rate   : null,
                    'margin' => $pp->margin !== null ? (float)$pp->margin : null,
                    // السعر المحسوب النهائي (للعرض والفاتورة)
                    'price_ht' => $pp->computePrice($purchasePrice),
                    'active'   => (bool)$pp->active,
                ])->values()
            ),

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts' => $this->whenLoaded('quantityDiscounts', fn() =>
                $this->quantityDiscounts->map(fn($d) => [
                    'id'                  => $d->id,
                    'price_level_id'      => $d->price_level_id,
                    'price_level'         => $d->relationLoaded('priceLevel') && $d->priceLevel ? [
                        'id'   => $d->priceLevel->id,
                        'name' => $d->priceLevel->name,
                    ] : null,
                    'min_qty'             => (float)$d->min_qty,
                    'max_qty'             => $d->max_qty !== null ? (float)$d->max_qty : null,
                    'discount_amount'     => $d->discount_amount     !== null ? (float)$d->discount_amount     : null,
                    'discount_percentage' => $d->discount_percentage !== null ? (float)$d->discount_percentage : null,
                    'tier_order'          => $d->tier_order,
                    'is_blocked'          => (bool)$d->is_blocked,
                    'active'              => (bool)$d->active,
                ])->values()
            ),
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
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'manages_stock' => $this->manages_stock,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'price_type' => $this->price_type,
            'price_value' => $this->price_value,
            'final_price' => $this->final_price,
            'stock' => $this->stock,
            'track_stock' => (bool) $this->track_stock,
            'is_in_stock' => $this->is_in_stock,
            'attributes' => $this->attributes,
            'image' => $this->image,
            'weight' => $this->weight,
            'volume' => $this->volume,
            'active' => (bool) $this->active,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'barcodes' => BarcodeResource::collection($this->whenLoaded('barcodes')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'product_id' => $this->product_id,
            'min_quantity' => $this->min_qty,
            'max_quantity' => $this->max_qty,
            'discount_per_unit' => $this->discount_amount,
            'discount_percentage' => $this->discount_percentage,
            'tier_order' => $this->tier_order,
            'active' => $this->active,
            'valid_from' => $this->valid_from?->toIso8601String(),
            'valid_to' => $this->valid_to?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'priceLevel' => $this->whenLoaded('priceLevel', fn() => [
                    'id' => $this->priceLevel->id,
                    'name' => $this->priceLevel->name,
                ]),
            ],
        ];
    }
}




// ===== ملف: RoleResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            
            'relations' => [
                'permissions' => $this->whenLoaded('permissions', fn() => 
                    $this->permissions->map(fn($p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'display_name' => $p->display_name,
                    ])
                ),
            ],
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
            'id' => $this->id,
            'key' => $this->key,
            'group' => $this->group,
            'value' => $this->value,
            'type' => $this->type,
            'description' => $this->description,
            'is_public' => $this->is_public,
            'is_editable' => $this->is_editable,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}



// ===== ملف: StockMovementResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'stock_movement_type_id' => $this->stock_movement_type_id,
            'commercial_document_line_id' => $this->commercial_document_line_id,
            'movement_date' => $this->movement_date?->toIso8601String(),
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'cost_price' => $this->cost_price,
            'total_price' => $this->total_price,
            'stock_balance_after' => $this->stock_balance_after,
            'lot_number' => $this->lot_number,
            'expiration_date' => $this->expiration_date?->toIso8601String(),
            'reason' => $this->reason,
            'notes' => $this->notes,
            'is_validated' => $this->is_validated,
            'validated_at' => $this->validated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'relations' => [
                'product' => $this->whenLoaded('product', fn() => [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'ref' => $this->product->ref,
                ]),
                'warehouse' => $this->whenLoaded('warehouse', fn() => [
                    'id' => $this->warehouse->id,
                    'name' => $this->warehouse->name,
                ]),
                'stockMovementType' => $this->whenLoaded('stockMovementType', fn() => [
                    'id' => $this->stockMovementType->id,
                    'name' => $this->stockMovementType->name,
                    'direction' => $this->stockMovementType->direction,
                ]),
            ],

            'computed' => [
                'is_incoming' => $this->is_incoming(),
                'is_outgoing' => $this->is_outgoing(),
                'is_adjustment' => $this->is_adjustment(),
            ],
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
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'direction' => $this->direction,
            'active' => $this->active,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'computed' => [
                'is_incoming' => $this->is_incoming(),
                'is_outgoing' => $this->is_outgoing(),
                'is_neutral' => $this->is_neutral(),
            ],
        ];
    }
}




// ===== ملف: TreasuryAccountResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TreasuryAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'code' => $this->code, 'treasury_account_type_id' => $this->treasury_account_type_id,
            'bank_name' => $this->bank_name, 'account_number' => $this->account_number, 'rib' => $this->rib, 'iban' => $this->iban,
            'swift_bic' => $this->swift_bic, 'currency' => $this->currency, 'initial_balance' => $this->initial_balance,
            'current_balance' => $this->current_balance, 'is_default' => $this->is_default, 'active' => $this->active,
            'notes' => $this->notes, 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(),
            'is_bank_account' => $this->is_bank_account, 'is_cash_account' => $this->is_cash_account,
            'relations' => ['treasuryAccountType' => $this->whenLoaded('treasuryAccountType', fn() => ['id' => $this->treasuryAccountType->id, 'name' => $this->treasuryAccountType->name])],
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
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}




// ===== ملف: UserResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
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
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'commune_id' => $this->commune_id,
            'wilaya_id' => $this->wilaya_id,
            'phone' => $this->phone,
            'manager_name' => $this->manager_name,
            'activity' => $this->activity,
            'rc' => $this->rc,
            'nif' => $this->nif,
            'nis' => $this->nis,
            'ai' => $this->ai,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}




// ===== ملف: WilayaResource.php =====
namespace App\Http\Resources;

use Illuminate\Http\Request;

class WilayaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'arabic_name' => $this->arabic_name,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'active' => $this->active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}


