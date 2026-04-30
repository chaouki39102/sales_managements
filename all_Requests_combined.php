<?php

// دمج تلقائي لكل ملفات الـ Requests



// ===== ملف: AttachmentRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name' => 'required|string|max:255',
            'file_path' => 'required|string|max:500',
            'file_type' => 'nullable|string|max:100',
            'file_extension' => 'nullable|string|max:20',
            'file_size' => 'nullable|integer|min:0',
            'attachable_type' => 'nullable|string|max:150',
            'attachable_id' => 'nullable|integer',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'is_public' => 'nullable|boolean',
            'disk' => 'nullable|string|max:50',
            'uploaded_by' => 'nullable|integer|exists:users,id',
        ];
    }
}

class UpdateAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file_name' => 'sometimes|string|max:255',
            'file_path' => 'sometimes|string|max:500',
            'file_type' => 'nullable|string|max:100',
            'file_extension' => 'nullable|string|max:20',
            'file_size' => 'nullable|integer|min:0',
            'attachable_type' => 'nullable|string|max:150',
            'attachable_id' => 'nullable|integer',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'is_public' => 'nullable|boolean',
            'disk' => 'nullable|string|max:50',
            'uploaded_by' => 'nullable|integer|exists:users,id',
        ];
    }
}



// ===== ملف: AuditRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer',
            'user_type' => 'nullable|string|max:150',
            'event' => 'required|string|max:50',
            'auditable_type' => 'nullable|string|max:150',
            'auditable_id' => 'nullable|integer',
            'old_values' => 'nullable|array',
            'new_values' => 'nullable|array',
            'url' => 'nullable|string|max:500',
            'ip_address' => 'nullable|string|max:45',
            'user_agent' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ];
    }
}

class UpdateAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer',
            'user_type' => 'nullable|string|max:150',
            'event' => 'sometimes|string|max:50',
            'auditable_type' => 'nullable|string|max:150',
            'auditable_id' => 'nullable|integer',
            'old_values' => 'nullable|array',
            'new_values' => 'nullable|array',
            'url' => 'nullable|string|max:500',
            'ip_address' => 'nullable|string|max:45',
            'user_agent' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ];
    }
}



// ===== ملف: CheckRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_number' => 'required|string|max:50',
            'check_date' => 'required|date',
            'due_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'drawer_name' => 'nullable|string|max:150',
            'party_id' => 'nullable|exists:parties,id',
            'status' => 'nullable|string|in:pending,cleared,bounced',
            'notes' => 'nullable|string|max:500',
            'metadata' => 'nullable|array',
        ];
    }
}

class UpdateCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_number' => 'sometimes|string|max:50',
            'check_date' => 'sometimes|date',
            'due_date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'drawer_name' => 'nullable|string|max:150',
            'party_id' => 'nullable|exists:parties,id',
            'status' => 'nullable|string|in:pending,cleared,bounced',
            'notes' => 'nullable|string|max:500',
            'metadata' => 'nullable|array',
        ];
    }
}



// ===== ملف: CommercialDocumentRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'required|integer|exists:document_types,id',
            'party_id' => 'required|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:document_date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'is_proforma' => 'nullable|boolean',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer|exists:products,id',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.unit_price_ht' => 'required|numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
            'lines.*.description' => 'nullable|string',
        ];
    }
}

class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $documentId = $this->route('commercial_document');

        return [
            'document_type_id' => 'sometimes|integer|exists:document_types,id',
            'party_id' => 'sometimes|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'lines' => 'sometimes|array|min:1',
            'lines.*.product_id' => 'integer|exists:products,id',
            'lines.*.quantity' => 'numeric|min:0.001',
            'lines.*.unit_price_ht' => 'numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
        ];
    }
}




// ===== ملف: DocumentStatusRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:50|unique:document_statuses,name',
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
        ];
    }
}

class UpdateDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:50|unique:document_statuses,name,' . $this->route('document_status'),
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
        ];
    }
}



// ===== ملف: EmployeeRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'matricule' => 'nullable|string|max:50|unique:employees,matricule',
            'user_id' => 'nullable|exists:users,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'nss' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'rib' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:50',
        ];
    }
}

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'matricule' => 'sometimes|string|max:50|unique:employees,matricule,' . $this->route('employee'),
            'user_id' => 'nullable|exists:users,id',
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'nss' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'rib' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:50',
        ];
    }
}



// ===== ملف: EmploymentContractRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmploymentContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'required|exists:employees,id',
            'contract_type' => 'required|string|max:50',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'nullable|numeric|min:0',
            'job_title' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'is_active' => 'nullable|boolean',
        ];
    }
}

class UpdateEmploymentContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'sometimes|exists:employees,id',
            'contract_type' => 'sometimes|string|max:50',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'nullable|numeric|min:0',
            'job_title' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'is_active' => 'nullable|boolean',
        ];
    }
}



// ===== ملف: ExchangeRateRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExchangeRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_currency_id' => 'required|exists:currencies,id',
            'to_currency_id' => 'required|exists:currencies,id|different:from_currency_id',
            'rate' => 'required|numeric|min:0',
            'rate_date' => 'required|date',
        ];
    }
}

class UpdateExchangeRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_currency_id' => 'sometimes|exists:currencies,id',
            'to_currency_id' => 'sometimes|exists:currencies,id|different:from_currency_id',
            'rate' => 'sometimes|numeric|min:0',
            'rate_date' => 'sometimes|date',
        ];
    }
}



// ===== ملف: ExpenseCategoryRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:expense_categories,code',
            'description' => 'nullable|string|max:500',
            'parent_id' => 'nullable|exists:expense_categories,id',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdateExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150',
            'code' => 'nullable|string|max:50|unique:expense_categories,code,' . $this->route('expense_category'),
            'description' => 'nullable|string|max:500',
            'parent_id' => 'nullable|exists:expense_categories,id',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}



// ===== ملف: NumberingSeriesRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNumberingSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'required|exists:document_types,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'prefix' => 'nullable|string|max:20',
            'suffix' => 'nullable|string|max:20',
            'format' => 'required|string|max:50',
            'last_number' => 'nullable|integer|min:0',
            'padding' => 'nullable|integer|min:1|max:10',
            'start_number' => 'nullable|integer|min:1',
            'max_number' => 'nullable|integer|min:1',
            'reset_yearly' => 'nullable|boolean',
            'reset_monthly' => 'nullable|boolean',
            'active' => 'nullable|boolean',
        ];
    }
}

class UpdateNumberingSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'sometimes|exists:document_types,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'prefix' => 'nullable|string|max:20',
            'suffix' => 'nullable|string|max:20',
            'format' => 'sometimes|string|max:50',
            'last_number' => 'nullable|integer|min:0',
            'padding' => 'nullable|integer|min:1|max:10',
            'start_number' => 'nullable|integer|min:1',
            'max_number' => 'nullable|integer|min:1',
            'reset_yearly' => 'nullable|boolean',
            'reset_monthly' => 'nullable|boolean',
            'active' => 'nullable|boolean',
        ];
    }
}



// ===== ملف: OpeningBalancePartyRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'party_id' => 'required|exists:parties,id',
            'opening_balance' => 'required|numeric',
            'balance_type' => 'required|in:debit,credit',
        ];
    }
}

class UpdateOpeningBalancePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'party_id' => 'sometimes|exists:parties,id',
            'opening_balance' => 'sometimes|numeric',
            'balance_type' => 'sometimes|in:debit,credit',
        ];
    }
}



// ===== ملف: OpeningBalanceStockRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'required|numeric|min:0',
            'opening_value' => 'required|numeric|min:0',
        ];
    }
}

class UpdateOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'product_id' => 'sometimes|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'sometimes|numeric|min:0',
            'opening_value' => 'sometimes|numeric|min:0',
        ];
    }
}




// ===== ملف: PaymentModeRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code',
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdatePaymentModeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:50|unique:payment_modes,code,' . $this->route('payment_mode'),
            'description' => 'nullable|string|max:500',
            'treasury_account_id' => 'nullable|exists:treasury_accounts,id',
            'requires_reference' => 'nullable|boolean',
            'is_cash' => 'nullable|boolean',
            'active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}



// ===== ملف: PermissionRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:permissions,name',
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'group' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
        ];
    }
}

class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255|unique:permissions,name,' . $this->route('permission'),
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'group' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
        ];
    }
}



// ===== ملف: QuantityDiscountRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuantityDiscountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id', 'min_quantity' => 'required|numeric|min:0',
            'max_quantity' => 'nullable|numeric|min:0|gte:min_quantity', 'discount_per_unit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100', 'tier_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
        ];
    }
}

class UpdateQuantityDiscountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'product_id' => 'sometimes|exists:products,id', 'min_quantity' => 'sometimes|numeric|min:0',
            'max_quantity' => 'nullable|numeric|min:0|gte:min_quantity', 'discount_per_unit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100', 'tier_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean', 'valid_from' => 'nullable|date', 'valid_to' => 'nullable|date|after:valid_from',
        ];
    }
}




// ===== ملف: RoleRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:roles,name',
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ];
    }
}

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $this->route('role'),
            'guard_name' => 'nullable|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ];
    }
}



// ===== ملف: SettingRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'required|string|max:150|unique:settings,key',
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'sometimes|string|max:150|unique:settings,key,' . $this->route('setting'),
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}



// ===== ملف: StorePartyRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Store Party Request
 *
 * التحقق من صحة بيانات إنشاء متعامل جديد
 */
class StorePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Party type (required)
            'party_type_id' => 'required|exists:party_types,id',

            // Basic information
            'code' => 'nullable|string|max:50|unique:parties,code',
            'name' => 'required|string|max:150',
            'commercial_name' => 'nullable|string|max:150',

            // Algerian legal information
            'activity' => 'nullable|string|max:500',
            'rc' => 'nullable|string|max:50',
            'nif' => 'nullable|string|regex:/^\d{15,16}$/|unique:parties,nif',
            'nis' => 'nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'nullable|string|max:50',
            'legal_form_id' => 'nullable|exists:legal_forms,id',
            'capital_amount' => 'nullable|numeric|min:0',
            'rc_date' => 'nullable|date|before:today',

            // Contact information
            'address' => 'nullable|string|max:500',
            'commune_id' => 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:30',
            'fax' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100|unique:parties,email',

            // Banking information
            'bank_name' => 'nullable|string|max:100',
            'rib' => 'nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'nullable|numeric',
            'credit_limit' => 'nullable|numeric|min:0',
            'default_price_level_id' => 'nullable|exists:price_levels,id',
            'credit_days' => 'nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'nullable|boolean',
            'is_taxable' => 'nullable|boolean',
            'tax_option' => 'nullable|string|max:50',
            'cnas_number' => 'nullable|string|max:50',
            'tax_regime' => 'nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'nullable|boolean',
            'is_vat_registered' => 'nullable|boolean',
            'vat_registration_date' => 'nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'nullable|array',
            'active' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.required' => 'نوع المتعامل مطلوب',
            'party_type_id.exists' => 'نوع المتعامل غير صحيح',
            'code.unique' => 'الرمز موجود بالفعل',
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم يجب أن لا يتجاوز 150 حرف',
            'commercial_name.max' => 'الاسم التجاري يجب أن لا يتجاوز 150 حرف',
            'rc.max' => 'رقم السجل التجاري يجب أن لا يتجاوز 50 حرف',
            'nif.regex' => 'رقم التعريف الجبائي يجب أن يكون 15-16 رقم',
            'nif.unique' => 'رقم التعريف الجبائي موجود بالفعل',
            'nis.regex' => 'رقم التعريف الإحصائي يجب أن يكون 10-15 رقم',
            'ai.max' => 'المادة الجبائية يجب أن لا تتجاوز 50 حرف',
            'legal_form_id.exists' => 'الشكل القانوني غير صحيح',
            'capital_amount.numeric' => 'رأس المال يجب أن يكون رقماً',
            'capital_amount.min' => 'رأس المال يجب أن يكون موجباً',
            'rc_date.date' => 'تاريخ السجل التجاري غير صحيح',
            'rc_date.before' => 'تاريخ السجل التجاري يجب أن يكون في الماضي',
            'address.max' => 'العنوان يجب أن لا يتجاوز 500 حرف',
            'commune_id.exists' => 'البلدية غير صحيحة',
            'wilaya_id.exists' => 'الولاية غير صحيحة',
            'phone.max' => 'الهاتف يجب أن لا يتجاوز 20 حرف',
            'mobile.max' => 'الجوال يجب أن لا يتجاوز 30 حرف',
            'fax.max' => 'الفاكس يجب أن لا يتجاوز 30 حرف',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.unique' => 'البريد الإلكتروني موجود بالفعل',
            'bank_name.max' => 'اسم البنك يجب أن لا يتجاوز 100 حرف',
            'rib.max' => 'RIB يجب أن لا يتجاوز 30 حرف',
            'initial_balance.numeric' => 'الرصيد الابتدائي يجب أن يكون رقماً',
            'credit_limit.numeric' => 'الحد الائتماني يجب أن يكون رقماً',
            'credit_limit.min' => 'الحد الائتماني يجب أن يكون موجباً',
            'default_price_level_id.exists' => 'مستوى السعر الافتراضي غير صحيح',
            'credit_days.integer' => 'أيام الائتمان يجب أن تكون رقماً صحيحاً',
            'credit_days.min' => 'أيام الائتمان يجب أن تكون موجبة',
            'credit_days.max' => 'أيام الائتمان يجب أن لا تتجاوز 365 يوم',
            'is_tva_exempt.boolean' => 'معفى من TVA يجب أن يكون صحيح أو خطأ',
            'is_taxable.boolean' => 'خاضع للضريبة يجب أن يكون صحيح أو خطأ',
            'tax_option.max' => 'خيار الضريبة يجب أن لا يتجاوز 50 حرف',
            'cnas_number.max' => 'رقم CNAS يجب أن لا يتجاوز 50 حرف',
            'tax_regime.in' => 'نظام الضريبة يجب أن يكون forfaitaire أو réel',
            'is_final_consumer.boolean' => 'مستهلك نهائي يجب أن يكون صحيح أو خطأ',
            'is_vat_registered.boolean' => 'مسجل في TVA يجب أن يكون صحيح أو خطأ',
            'vat_registration_date.date' => 'تاريخ التسجيل في TVA غير صحيح',
            'vat_registration_date.before_or_equal' => 'تاريخ التسجيل في TVA يجب أن يكون اليوم أو في الماضي',
            'additional_data.array' => 'البيانات الإضافية يجب أن تكون مصفوفة',
            'active.boolean' => 'التفعيل يجب أن يكون صحيح أو خطأ',
        ];
    }

    public function prepareForValidation()
    {
        // Set default values
        if (!$this->has('active')) {
            $this->merge(['active' => true]);
        }
        if (!$this->has('is_taxable')) {
            $this->merge(['is_taxable' => true]);
        }
        if (!$this->has('initial_balance')) {
            $this->merge(['initial_balance' => 0.00]);
        }
        if (!$this->has('credit_limit')) {
            $this->merge(['credit_limit' => 0.00]);
        }
    }
}



// ===== ملف: StoreProductRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // ── المنتج الأساسي ──
            'name'             => 'required|string|max:150',
            'slug'             => 'nullable|string|max:150|unique:products,slug',  // اختياري، فريد إذا وُجد
            'ref'              => 'nullable|string|max:50|unique:products,ref',
            'barcode'          => 'nullable|string|max:50|unique:products,barcode',
            'description'      => 'nullable|string',
            'family_id'        => 'nullable|integer|exists:families,id',
            'brand_id'         => 'nullable|integer|exists:brands,id',
            'product_type_id'  => 'required|integer|exists:product_types,id',
            'tva_id'           => 'nullable|integer|exists:tvas,id',
            'unit_id'          => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'           => 'nullable|array',
            'images.*'         => 'nullable|string',
            'active'           => 'nullable|boolean',

            // ── التسعير والمخزون ──
            'purchase_price_ht'           => 'nullable|numeric|min:0',
            'manages_stock'               => 'nullable|boolean',
            'allow_negative_stock'        => 'nullable|boolean',
            'has_lots'                    => 'nullable|boolean',
            'has_expiration_date'         => 'nullable|boolean',
            'min_stock_alert'             => 'nullable|numeric|min:0',
            'max_stock_alert'             => 'nullable|numeric|min:0',
            'manages_quantity_discounts'  => 'nullable|boolean',

            // ── الأبعاد ──
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            // ── وحدات التعبئة (Colisages) ──
            'packagings'               => 'nullable|array',
            'packagings.*.code'        => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'       => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'    => 'nullable|numeric|min:0.0001', // أصبح اختيارياً (القيمة الافتراضية 1)
            'packagings.*.barcode'     => 'nullable|string|max:50|unique:product_packagings,barcode',
            'packagings.*.is_default'  => 'nullable|boolean',
            'packagings.*.active'      => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            // ── التعريفات (Tarifs) ──
            'prices'                      => 'nullable|array',
            'prices.*.price_level_id'     => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method'     => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'  => 'nullable|numeric|min:0',
            'prices.*.rate'   => 'nullable|numeric|min:0',
            'prices.*.margin' => 'nullable|numeric',
            'prices.*.active' => 'nullable|boolean',

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts'                        => 'nullable|array',
            'quantity_discounts.*.price_level_id'       => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'              => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'              => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'      => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage'  => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'           => 'nullable|boolean',
            'quantity_discounts.*.active'               => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم المنتج مطلوب',
            'product_type_id.required' => 'نوع المنتج مطلوب',
            'ref.unique' => 'هذا المرجع مستخدم بالفعل',
            'barcode.unique' => 'هذا الباركود مستخدم بالفعل',
            'packagings.*.code.required_with' => 'رمز التعبئة مطلوب عند إضافة تعبئة',
            'packagings.*.label.required_with' => 'تسمية التعبئة مطلوبة عند إضافة تعبئة',
            'prices.*.price_level_id.required_with' => 'مستوى السعر مطلوب عند إضافة تعريف',
            'prices.*.pricing_method.required_with' => 'طريقة التسعير مطلوبة عند إضافة تعريف',
            'prices.*.pricing_method.in' => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.min_qty.required_with' => 'الحد الأدنى للكمية مطلوب عند إضافة خصم',
            'quantity_discounts.*.max_qty.gt' => 'الحد الأعلى يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}



// ===== ملف: TreasuryAccountRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code',
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}

class UpdateTreasuryAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:150', 'code' => 'nullable|string|max:50|unique:treasury_accounts,code,' . $this->route('treasury_account'),
            'treasury_account_type_id' => 'nullable|exists:treasury_account_types,id', 'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50', 'rib' => 'nullable|string|max:30', 'iban' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:10',
            'initial_balance' => 'nullable|numeric', 'is_default' => 'nullable|boolean', 'active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }
}



// ===== ملف: UpdatePartyRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Party Request
 *
 * التحقق من صحة بيانات تحديث متعامل موجود
 */
class UpdatePartyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $partyId = $this->route('party')?->id ?? $this->route('id');

        return [
            // Party type
            'party_type_id' => 'sometimes|exists:party_types,id',

            // Basic information
            'code' => "sometimes|nullable|string|max:50|unique:parties,code,{$partyId}",
            'name' => 'sometimes|required|string|max:150',
            'commercial_name' => 'sometimes|nullable|string|max:150',

            // Algerian legal information
            'activity' => 'sometimes|nullable|string|max:500',
            'rc' => 'sometimes|nullable|string|max:50',
            'nif' => "sometimes|nullable|string|regex:/^\d{15,16}$/|unique:parties,nif,{$partyId}",
            'nis' => 'sometimes|nullable|string|regex:/^\d{10,15}$/',
            'ai' => 'sometimes|nullable|string|max:50',
            'legal_form_id' => 'sometimes|nullable|exists:legal_forms,id',
            'capital_amount' => 'sometimes|nullable|numeric|min:0',
            'rc_date' => 'sometimes|nullable|date|before:today',

            // Contact information
            'address' => 'sometimes|nullable|string|max:500',
            'commune_id' => 'sometimes|nullable|exists:communes,id',
            'wilaya_id' => 'sometimes|nullable|exists:wilayas,id',
            'phone' => 'sometimes|nullable|string|max:20',
            'mobile' => 'sometimes|nullable|string|max:30',
            'fax' => 'sometimes|nullable|string|max:30',
            'email' => "sometimes|nullable|email|max:100|unique:parties,email,{$partyId}",

            // Banking information
            'bank_name' => 'sometimes|nullable|string|max:100',
            'rib' => 'sometimes|nullable|string|max:30',

            // Financial settings
            'initial_balance' => 'sometimes|nullable|numeric',
            'credit_limit' => 'sometimes|nullable|numeric|min:0',
            'default_price_level_id' => 'sometimes|nullable|exists:price_levels,id',
            'credit_days' => 'sometimes|nullable|integer|min:0|max:365',

            // Tax settings
            'is_tva_exempt' => 'sometimes|nullable|boolean',
            'is_taxable' => 'sometimes|nullable|boolean',
            'tax_option' => 'sometimes|nullable|string|max:50',
            'cnas_number' => 'sometimes|nullable|string|max:50',
            'tax_regime' => 'sometimes|nullable|in:forfaitaire,réel',
            'is_final_consumer' => 'sometimes|nullable|boolean',
            'is_vat_registered' => 'sometimes|nullable|boolean',
            'vat_registration_date' => 'sometimes|nullable|date|before_or_equal:today',

            // Additional settings
            'additional_data' => 'sometimes|nullable|array',
            'active' => 'sometimes|nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'party_type_id.exists' => 'نوع المتعامل غير صحيح',
            'code.unique' => 'الرمز موجود بالفعل',
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم يجب أن لا يتجاوز 150 حرف',
            'commercial_name.max' => 'الاسم التجاري يجب أن لا يتجاوز 150 حرف',
            'rc.max' => 'رقم السجل التجاري يجب أن لا يتجاوز 50 حرف',
            'nif.regex' => 'رقم التعريف الجبائي يجب أن يكون 15-16 رقم',
            'nif.unique' => 'رقم التعريف الجبائي موجود بالفعل',
            'nis.regex' => 'رقم التعريف الإحصائي يجب أن يكون 10-15 رقم',
            'ai.max' => 'المادة الجبائية يجب أن لا تتجاوز 50 حرف',
            'legal_form_id.exists' => 'الشكل القانوني غير صحيح',
            'capital_amount.numeric' => 'رأس المال يجب أن يكون رقماً',
            'capital_amount.min' => 'رأس المال يجب أن يكون موجباً',
            'rc_date.date' => 'تاريخ السجل التجاري غير صحيح',
            'rc_date.before' => 'تاريخ السجل التجاري يجب أن يكون في الماضي',
            'address.max' => 'العنوان يجب أن لا يتجاوز 500 حرف',
            'commune_id.exists' => 'البلدية غير صحيحة',
            'wilaya_id.exists' => 'الولاية غير صحيحة',
            'phone.max' => 'الهاتف يجب أن لا يتجاوز 20 حرف',
            'mobile.max' => 'الجوال يجب أن لا يتجاوز 30 حرف',
            'fax.max' => 'الفاكس يجب أن لا يتجاوز 30 حرف',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.unique' => 'البريد الإلكتروني موجود بالفعل',
            'bank_name.max' => 'اسم البنك يجب أن لا يتجاوز 100 حرف',
            'rib.max' => 'RIB يجب أن لا يتجاوز 30 حرف',
            'initial_balance.numeric' => 'الرصيد الابتدائي يجب أن يكون رقماً',
            'credit_limit.numeric' => 'الحد الائتماني يجب أن يكون رقماً',
            'credit_limit.min' => 'الحد الائتماني يجب أن يكون موجباً',
            'default_price_level_id.exists' => 'مستوى السعر الافتراضي غير صحيح',
            'credit_days.integer' => 'أيام الائتمان يجب أن تكون رقماً صحيحاً',
            'credit_days.min' => 'أيام الائتمان يجب أن تكون موجبة',
            'credit_days.max' => 'أيام الائتمان يجب أن لا تتجاوز 365 يوم',
            'is_tva_exempt.boolean' => 'معفى من TVA يجب أن يكون صحيح أو خطأ',
            'is_taxable.boolean' => 'خاضع للضريبة يجب أن يكون صحيح أو خطأ',
            'tax_option.max' => 'خيار الضريبة يجب أن لا يتجاوز 50 حرف',
            'cnas_number.max' => 'رقم CNAS يجب أن لا يتجاوز 50 حرف',
            'tax_regime.in' => 'نظام الضريبة يجب أن يكون forfaitaire أو réel',
            'is_final_consumer.boolean' => 'مستهلك نهائي يجب أن يكون صحيح أو خطأ',
            'is_vat_registered.boolean' => 'مسجل في TVA يجب أن يكون صحيح أو خطأ',
            'vat_registration_date.date' => 'تاريخ التسجيل في TVA غير صحيح',
            'vat_registration_date.before_or_equal' => 'تاريخ التسجيل في TVA يجب أن يكون اليوم أو في الماضي',
            'additional_data.array' => 'البيانات الإضافية يجب أن تكون مصفوفة',
            'active.boolean' => 'التفعيل يجب أن يكون صحيح أو خطأ',
        ];
    }
}



// ===== ملف: UpdateProductRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('product');
        return [
            'name'             => 'sometimes|string|max:150',
            'slug'             => "sometimes|string|max:150|unique:products,slug,{$id}",
            'ref'              => "nullable|string|max:50|unique:products,ref,{$id}",
            'barcode'          => "nullable|string|max:50|unique:products,barcode,{$id}",
            'description'      => 'nullable|string',
            'family_id'        => 'nullable|integer|exists:families,id',
            'brand_id'         => 'nullable|integer|exists:brands,id',
            'product_type_id'  => 'sometimes|integer|exists:product_types,id',
            'tva_id'           => 'nullable|integer|exists:tvas,id',
            'unit_id'          => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'           => 'nullable|array',
            'images.*'         => 'nullable|string',
            'active'           => 'nullable|boolean',

            'purchase_price_ht'           => 'nullable|numeric|min:0',
            'manages_stock'               => 'nullable|boolean',
            'allow_negative_stock'        => 'nullable|boolean',
            'has_lots'                    => 'nullable|boolean',
            'has_expiration_date'         => 'nullable|boolean',
            'min_stock_alert'             => 'nullable|numeric|min:0',
            'max_stock_alert'             => 'nullable|numeric|min:0',
            'manages_quantity_discounts'  => 'nullable|boolean',

            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            'packagings'                 => 'sometimes|array',
            'packagings.*.id'            => 'nullable|integer|exists:product_packagings,id',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            'packagings.*.barcode'       => 'nullable|string|max:50|unique:product_packagings,barcode,' . $this->input('packagings.*.id'),
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            'prices'                      => 'sometimes|array',
            'prices.*.price_level_id'     => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method'     => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'  => 'nullable|numeric|min:0',
            'prices.*.rate'   => 'nullable|numeric|min:0',
            'prices.*.margin' => 'nullable|numeric',
            'prices.*.active' => 'nullable|boolean',

            'quantity_discounts'                        => 'sometimes|array',
            'quantity_discounts.*.price_level_id'       => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'              => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'              => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'      => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage'  => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'           => 'nullable|boolean',
            'quantity_discounts.*.active'               => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'ref.unique' => 'هذا المرجع مستخدم بالفعل',
            'barcode.unique' => 'هذا الباركود مستخدم بالفعل',
            'prices.*.pricing_method.in' => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'packagings.*.barcode.unique' => 'باركود التعبئة مستخدم بالفعل',
            'quantity_discounts.*.max_qty.gt' => 'الحد الأعلى للكمية يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}

