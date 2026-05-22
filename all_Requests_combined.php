<?php

// دمج تلقائي لكل ملفات الـ Requests



// ===== ملف: AttachmentRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreAttachmentRequest
 *
 * المرفقات polymorphic — تُرفق لأي كيان (commercial_documents, parties, expenses...).
 * الـ attachable_type و attachable_id يُحددان الكيان المرتبط.
 *
 * خريطة الـ attachable_type المقبولة:
 *   commercial_document → App\Models\CommercialDocument
 *   party               → App\Models\Party
 *   expense             → App\Models\Expense
 *   product             → App\Models\Product
 *   employee            → App\Models\Employee
 *   payment             → App\Models\Payment
 */
class StoreAttachmentRequest extends FormRequest
{
    // الأنواع المدعومة — يقابل كل مفتاح morph alias في AppServiceProvider
    private const ALLOWED_TYPES = [
        'commercial_document',
        'party',
        'expense',
        'product',
        'employee',
        'payment',
        'check',
        'treasury_account',
    ];

    // أقصى حجم للملف: 20 MB
    private const MAX_FILE_SIZE_KB = 20480;

    // امتدادات مسموحة
    private const ALLOWED_EXTENSIONS = [
        'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp',
        'doc', 'docx', 'xls', 'xlsx', 'csv',
        'txt', 'zip',
    ];

    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // الملف — يمكن رفع ملف جديد أو تمرير مسار موجود
            'file'             => [
                Rule::requiredIf(fn () => empty($this->input('file_path'))),
                'file',
                'max:' . self::MAX_FILE_SIZE_KB,
                'mimes:' . implode(',', self::ALLOWED_EXTENSIONS),
            ],
            // مسار موجود مسبقاً (للحفظ بعد رفع منفصل via presigned URL)
            'file_path'        => ['nullable', 'string', 'max:500',
                                    Rule::requiredIf(fn () => empty($this->file('file')))],

            // معلومات الملف (تُحسب تلقائياً من الملف إذا لم تُرسَل)
            'file_name'        => 'nullable|string|max:255',
            'file_type'        => 'nullable|string|max:50',
            'file_extension'   => 'nullable|string|max:10',
            'file_size'        => 'nullable|integer|min:0',

            // الكيان المرتبط (Polymorphic)
            'attachable_type'  => ['required', 'string', Rule::in(self::ALLOWED_TYPES)],
            'attachable_id'    => 'required|integer|min:1',

            // بيانات وصفية
            'title'            => 'nullable|string|max:200',
            'description'      => 'nullable|string|max:1000',
            'category'         => 'nullable|string|max:50',

            // خيارات الوصول
            'is_public'        => 'nullable|boolean',
            'disk'             => ['nullable', 'string', Rule::in(['local', 'public', 's3'])],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required'              => 'الملف مطلوب',
            'file.max'                   => 'حجم الملف يجب أن لا يتجاوز 20 ميجابايت',
            'file.mimes'                 => 'نوع الملف غير مدعوم. الأنواع المقبولة: ' . implode(', ', self::ALLOWED_EXTENSIONS),
            'attachable_type.required'   => 'نوع الكيان المرتبط مطلوب',
            'attachable_type.in'         => 'نوع الكيان غير مدعوم',
            'attachable_id.required'     => 'معرّف الكيان المرتبط مطلوب',
        ];
    }
}


class UpdateAttachmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // عند التحديث — فقط البيانات الوصفية قابلة للتعديل
            // الملف نفسه لا يتغير (يُحذف القديم وينشأ جديد)
            'title'       => 'sometimes|nullable|string|max:200',
            'description' => 'sometimes|nullable|string|max:1000',
            'category'    => 'sometimes|nullable|string|max:50',
            'is_public'   => 'sometimes|nullable|boolean',
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
            'matricule' => [
                'required',
                'string',
                'max:20',
                'unique:employees,matricule,NULL,id,company_id,' . auth()->user()->current_company_id
            ],
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
            'active' => 'nullable|boolean',
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
            'active' => 'nullable|boolean',
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



// ===== ملف: Expenserequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'expense_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('expenses', 'expense_number')->where('company_id', $companyId)],
            'date'                => 'required|date',
            'amount'              => 'required|numeric|min:0.0001',
            'expense_category_id' => 'required|integer|exists:expense_categories,id',
            'fiscal_year_id'      => 'required|integer|exists:fiscal_years,id',

            // طريقة الدفع والخزينة — اختياريان (قد يكون مصروف غير مدفوع)
            'payment_mode_id'     => 'nullable|integer|exists:payment_modes,id',
            'treasury_account_id' => 'nullable|integer|exists:treasury_accounts,id',

            // المورد المرتبط (اختياري)
            'party_id'            => 'nullable|integer|exists:parties,id',

            'description'         => 'nullable|string|max:1000',
            'reference'           => 'nullable|string|max:100',

            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'is_paid'             => 'nullable|boolean',
            'is_recurring'        => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'date.required'                => 'تاريخ المصروف مطلوب',
            'amount.required'              => 'مبلغ المصروف مطلوب',
            'amount.min'                   => 'المبلغ يجب أن يكون أكبر من الصفر',
            'expense_category_id.required' => 'تصنيف المصروف مطلوب',
            'fiscal_year_id.required'      => 'السنة المالية مطلوبة',
            'expense_number.unique'        => 'رقم المصروف مستخدم بالفعل',
            'status.in'                    => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}


class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('expense');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'expense_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('expenses', 'expense_number')->ignore($id)->where('company_id', $companyId)],
            'date'                => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'expense_category_id' => 'sometimes|integer|exists:expense_categories,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'payment_mode_id'     => 'nullable|integer|exists:payment_modes,id',
            'treasury_account_id' => 'nullable|integer|exists:treasury_accounts,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'description'         => 'nullable|string|max:1000',
            'reference'           => 'nullable|string|max:100',
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'is_paid'             => 'nullable|boolean',
            'is_recurring'        => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'            => 'المبلغ يجب أن يكون أكبر من الصفر',
            'expense_number.unique' => 'رقم المصروف مستخدم بالفعل',
            'status.in'             => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}




// ===== ملف: Fiscalyearrequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'       => ['required', 'string', 'max:50',
                              Rule::unique('fiscal_years', 'name')->where('company_id', $companyId)],
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'اسم السنة المالية مطلوب (مثال: 2025)',
            'name.unique'         => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'start_date.required' => 'تاريخ البداية مطلوب',
            'end_date.required'   => 'تاريخ النهاية مطلوب',
            'end_date.after'      => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        ];
    }
}


class UpdateFiscalYearRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('fiscal_year');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'          => ['sometimes', 'string', 'max:50',
                                 Rule::unique('fiscal_years', 'name')->ignore($id)->where('company_id', $companyId)],
            // لا يُسمح بتعديل التواريخ إذا كانت السنة مغلقة — يتحقق Controller
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after:start_date',
            'is_current'    => 'nullable|boolean',
            // closing_notes فقط عند الإغلاق — يُرسَل من FiscalYearController::close()
            'closing_notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique'    => 'توجد سنة مالية بهذا الاسم مسبقاً',
            'end_date.after' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
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



// ===== ملف: Paymentrequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // رقم الدفعة — يولَّد تلقائياً إذا لم يُرسَل
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->where('company_id', $companyId)],
            'payment_date'        => 'required|date',
            'amount'              => 'required|numeric|min:0.0001',

            // العملة — اختياري، افتراضي DZD
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',

            // طريقة الدفع والحساب
            'payment_mode_id'     => 'required|integer|exists:payment_modes,id',
            'treasury_account_id' => 'required|integer|exists:treasury_accounts,id',

            // الشيك المرتبط — مطلوب فقط إذا كانت طريقة الدفع شيك
            'check_id'            => 'nullable|integer|exists:checks,id',

            // الطرف (عميل أو مورد)
            'party_id'            => 'nullable|integer|exists:parties,id',

            // السنة المالية
            'fiscal_year_id'      => 'required|integer|exists:fiscal_years,id',

            // مرجع ومعلومات إضافية
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',

            // الحالة
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],

            // ربط الدفعة بمستندات تجارية (جدول document_payment pivot)
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required'        => 'تاريخ الدفعة مطلوب',
            'amount.required'              => 'مبلغ الدفعة مطلوب',
            'amount.min'                   => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_mode_id.required'     => 'طريقة الدفع مطلوبة',
            'treasury_account_id.required' => 'الحساب المالي مطلوب',
            'fiscal_year_id.required'      => 'السنة المالية مطلوبة',
            'payment_number.unique'        => 'رقم الدفعة مستخدم بالفعل',
            'status.in'                    => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
        ];
    }
}


class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('payment');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'payment_number'      => ['nullable', 'string', 'max:50',
                                       Rule::unique('payments', 'payment_number')->ignore($id)->where('company_id', $companyId)],
            'payment_date'        => 'sometimes|date',
            'amount'              => 'sometimes|numeric|min:0.0001',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'amount_local'        => 'nullable|numeric|min:0',
            'payment_mode_id'     => 'sometimes|integer|exists:payment_modes,id',
            'treasury_account_id' => 'sometimes|integer|exists:treasury_accounts,id',
            'check_id'            => 'nullable|integer|exists:checks,id',
            'party_id'            => 'nullable|integer|exists:parties,id',
            'fiscal_year_id'      => 'sometimes|integer|exists:fiscal_years,id',
            'reference'           => 'nullable|string|max:100',
            'bank_reference'      => 'nullable|string|max:150',
            'notes'               => 'nullable|string|max:1000',
            'status'              => ['nullable', 'string', Rule::in(['confirmed', 'pending', 'cancelled'])],
            'document_ids'        => 'nullable|array',
            'document_ids.*'      => 'integer|exists:commercial_documents,id',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'              => 'مبلغ الدفعة يجب أن يكون أكبر من الصفر',
            'payment_number.unique'   => 'رقم الدفعة مستخدم بالفعل',
            'status.in'               => 'الحالة يجب أن تكون: confirmed أو pending أو cancelled',
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



// ===== ملف: Productlotrequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['required', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
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



// ===== ملف: Stockmovementrequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreStockMovementRequest
 *
 * حركات المخزون في الغالب تُنشأ تلقائياً من المستندات التجارية،
 * لكن يمكن إنشاؤها يدوياً (جرد، تسوية، نقل...).
 *
 * الكميات دائماً بالوحدة الأساسية — التحويل يتم في الـ Service.
 */
class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'product_id'              => 'required|integer|exists:products,id',
            'warehouse_id'            => 'required|integer|exists:warehouses,id',
            'stock_movement_type_id'  => 'required|integer|exists:stock_movement_types,id',
            'fiscal_year_id'          => 'required|integer|exists:fiscal_years,id',

            // وحدة التعبئة المستخدمة (اختياري — UN افتراضي)
            'packaging_id'            => 'nullable|integer|exists:product_packagings,id',

            'movement_date'           => 'required|date',

            // الكمية بالوحدة الأساسية
            'quantity'                => 'required|numeric|min:0.0001',
            // الكمية بوحدة التعبئة — للعرض فقط
            'packaging_quantity'      => 'nullable|numeric|min:0',

            // الأسعار
            'unit_price'              => 'required|numeric|min:0',
            'cost_price'              => 'nullable|numeric|min:0',

            // مصدر السعر
            'price_source'            => ['nullable', 'string', Rule::in(['purchase', 'sale', 'adjustment'])],

            // ربط بمستند تجاري (يُضبط تلقائياً من CommercialDocumentService)
            'commercial_document_line_id' => 'nullable|integer|exists:commercial_document_lines,id',

            // تتبع الدفعات (Lots)
            'lot_number'              => 'nullable|string|max:100',
            'expiration_date'         => 'nullable|date',
            'stock_lot_id'            => 'nullable|integer|exists:product_lots,id',

            'reason'                  => 'nullable|string|max:255',
            'notes'                   => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required'             => 'المنتج مطلوب',
            'warehouse_id.required'           => 'المستودع مطلوب',
            'stock_movement_type_id.required' => 'نوع الحركة مطلوب',
            'fiscal_year_id.required'         => 'السنة المالية مطلوبة',
            'movement_date.required'          => 'تاريخ الحركة مطلوب',
            'quantity.required'               => 'الكمية مطلوبة',
            'quantity.min'                    => 'الكمية يجب أن تكون أكبر من الصفر',
            'unit_price.required'             => 'سعر الوحدة مطلوب',
            'price_source.in'                 => 'مصدر السعر يجب أن يكون: purchase أو sale أو adjustment',
        ];
    }
}


class UpdateStockMovementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // حركات المخزون لا تُعدَّل في الغالب — فقط الحقول الوصفية
            'reason'   => 'sometimes|nullable|string|max:255',
            'notes'    => 'sometimes|nullable|string|max:1000',

            // السماح بتعديل السعر في حالة التسويات اليدوية
            'unit_price'  => 'sometimes|numeric|min:0',
            'cost_price'  => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'unit_price.min' => 'سعر الوحدة يجب أن يكون صفراً أو أكثر',
        ];
    }
}




// ===== ملف: StoreBarcodeRequest.php =====
declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // نحتاج للمنتج قبل التحقق من الصلاحية، لذا نجلب المنتج من قاعدة البيانات
        $product = \App\Models\Product::find($this->product_id);
        if (!$product) {
            return false;
        }
        return $this->user()->can('create', [\App\Models\Barcode::class, $product]);
    }

    public function rules(): array
    {
        return [
            'product_id' => [
                'required',
                'integer',
                // التحقق من أن المنتج موجود وينتمي لنفس الشركة النشطة
                Rule::exists('products', 'id')->where(function ($query) {
                    $query->where('company_id', $this->user()->current_company_id);
                }),
            ],
            'barcode' => [
                'required',
                'string',
                'max:255',
                // أيضا التحقق من أن الباركود فريد ضمن نطاق الشركة نفسها (اختياري لكن مفيد)
                Rule::unique('barcodes', 'barcode')->where(function ($query) {
                    $query->where('company_id', $this->user()->current_company_id);
                }),
            ],
            'type' => 'nullable|string|max:50',
            'is_primary' => 'boolean',
            'unit' => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.exists' => 'المنتج غير موجود أو لا يتبع شركتك.',
            'barcode.unique' => 'هذا الباركود مسجل مسبقاً ضمن شركتك.',
            'product_id.required' => 'المنتج مطلوب.',
        ];
    }

    // يمكن إضافة prepareForValidation() لتعيين current_company_id تلقائياً إذا لم يكن موجوداً
    protected function prepareForValidation(): void
    {
        // إذا لم يكن المستخدم يمتلك current_company_id في الجلسة، نجلبه من الـ service
        if (!$this->user()->current_company_id) {
            $companyId = app(\App\Services\CompanyContextService::class)->get();
            $this->user()->current_company_id = $companyId;
        }
    }
}




// ===== ملف: StoreCommercialDocumentRequest.php =====
namespace App\Http\Requests;

use App\Models\DocumentType;
use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ party_id: required/nullable يُحدَّد ديناميكياً حسب نوع الوثيقة.
 *    - Bon de transfert (BT): requires_party = false → nullable
 *    - باقي الأنواع: requires_party = true → required
 *
 * ✅ lines.*.packaging_id: nullable لأن migration أضافها لاحقاً
 *    ويجب أن يكون الـ Service هو من يتجاهلها لا الـ Request.
 *
 * ✅ fiscal_year_id: nullable — يعيّنه الـ Service تلقائياً
 *    من السنة المالية الحالية للشركة.
 *
 * ✅ currency_id: nullable — يُستخدم DZD (id=1) افتراضياً.
 * ══════════════════════════════════════════════════════════════════
 */
class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        // تحديد إذا كان نوع الوثيقة يتطلب طرفاً (عميل/مورد)
        $partyRequired = $this->resolvePartyRequired();

        return [
            // ── بيانات الوثيقة الأساسية ──────────────────────────────
            'document_type_id'    => 'required|integer|exists:document_types,id',

            // ✅ party_id: required أو nullable حسب نوع الوثيقة
            'party_id'            => $partyRequired
                                        ? 'required|integer|exists:parties,id'
                                        : 'nullable|integer|exists:parties,id',

            'warehouse_id'        => 'nullable|integer|exists:warehouses,id',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'nullable|integer|exists:numbering_series,id',
            'document_number'     => 'nullable|string|max:50',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'nullable|date',
            'issued_at'      => 'nullable|date',
            'due_date'       => 'nullable|date|after_or_equal:document_date',
            'delivery_date'  => 'nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'          => 'nullable|string|max:2000',
            'internal_notes' => 'nullable|string|max:2000',
            'payment_terms'  => 'nullable|array',
            'shipping_info'  => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'is_proforma'    => 'nullable|boolean',
            'exchange_rate'  => 'nullable|numeric|min:0.0001',

            // ── الأسطر ───────────────────────────────────────────────
            'lines'                            => 'required|array|min:1',
            'lines.*.product_id'               => 'required|integer|exists:products,id',
            'lines.*.quantity'                 => 'required|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.line_attributes'          => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'document_type_id.required'   => 'يجب تحديد نوع الوثيقة.',
            'party_id.required'           => 'يجب تحديد العميل أو المورد لهذا النوع من الوثائق.',
            'lines.required'              => 'يجب إضافة سطر واحد على الأقل.',
            'lines.min'                   => 'يجب إضافة سطر واحد على الأقل.',
            'lines.*.product_id.required' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.quantity.min'        => 'يجب أن تكون الكمية أكبر من الصفر.',
            'lines.*.unit_price_ht.required' => 'يجب تحديد السعر لكل سطر.',
            'lines.*.unit_price_ht.min'   => 'يجب أن يكون السعر غير سلبي.',
            'due_date.after_or_equal'     => 'يجب أن يكون تاريخ الاستحقاق بعد أو مساوياً لتاريخ الوثيقة.',
        ];
    }

    /**
     * تحديد إذا كان party_id إلزامياً حسب نوع الوثيقة.
     *
     * ✅ نجلب DocumentType مرة واحدة ونخزّنها في الـ instance
     * ✅ إذا لم نتمكن من تحديد النوع، نعتبره إلزامياً (الأكثر أماناً)
     */
    private function resolvePartyRequired(): bool
    {
        $documentTypeId = $this->input('document_type_id');

        if (!$documentTypeId) {
            return true; // إلزامي افتراضياً — validation ستفشل على document_type_id
        }

        $documentType = DocumentType::find($documentTypeId);

        // إذا لم يُعثر على النوع، requires_party = true افتراضياً
        return $documentType?->requires_party ?? true;
    }
}




// ===== ملف: StoreCompanyRequest.php =====
// app/Http/Requests/StoreCompanyRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => 'required|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'address'         => 'nullable|string|max:500',
            'tax_number'      => 'nullable|string|max:50',
            'nif'             => 'nullable|string|max:50|unique:companies,nif',
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الشركة مطلوب',
            'nif.unique'    => 'رقم التعريف الجبائي موجود بالفعل',
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

/**
 * StoreProductRequest
 *
 * الإصلاح: قواعد unique الأصلية كانت global (unique:products,ref)
 * مما يمنع شركتين مختلفتين من استخدام نفس ref/barcode/slug.
 *
 * الصحيح في بيئة Multi-Tenancy: الـ unique يكون بنطاق company_id
 * باستخدام Rule::unique()->where('company_id', ...).
 */
class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // ✅ company_id من السياق — HasCompany يضبطه تلقائياً عند الحفظ،
        //    لكن نحتاجه هنا للتحقق من الـ unique.
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            // ── المنتج الأساسي ──
            'name'            => 'required|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id
            'slug'    => [
                'nullable', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'required|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            // ── التسعير والمخزون ──
            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

            // ── الأبعاد ──
            'weight' => 'nullable|numeric|min:0',
            'volume' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'width'  => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',

            // ── وحدات التعبئة (Colisages) ──
            'packagings'                 => 'nullable|array',
            'packagings.*.code'          => 'required_with:packagings.*.label|string|max:20',
            'packagings.*.label'         => 'required_with:packagings.*.code|string|max:100',
            'packagings.*.quantity'      => 'nullable|numeric|min:0.0001',
            // ✅ إصلاح: unique مقيّد بـ company_id
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            // ── التعريفات (Tarifs) ──
            'prices'                  => 'nullable|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            // ── تخفيضات الكميات (Tx Remise) ──
            'quantity_discounts'                       => 'nullable|array',
            'quantity_discounts.*.price_level_id'      => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'             => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'             => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'     => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'          => 'nullable|boolean',
            'quantity_discounts.*.active'              => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                            => 'اسم المنتج مطلوب',
            'product_type_id.required'                 => 'نوع المنتج مطلوب',
            'ref.unique'                               => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                           => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                              => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.code.required_with'          => 'رمز التعبئة مطلوب عند إضافة تعبئة',
            'packagings.*.label.required_with'         => 'تسمية التعبئة مطلوبة عند إضافة تعبئة',
            'packagings.*.barcode.unique'              => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.price_level_id.required_with'   => 'مستوى السعر مطلوب عند إضافة تعريف',
            'prices.*.pricing_method.required_with'   => 'طريقة التسعير مطلوبة عند إضافة تعريف',
            'prices.*.pricing_method.in'              => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.min_qty.required_with' => 'الحد الأدنى للكمية مطلوب عند إضافة خصم',
            'quantity_discounts.*.max_qty.gt'         => 'الحد الأعلى يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}




// ===== ملف: StoreProductVariantRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = \App\Models\Product::find($this->product_id);
        return $product && $this->user()->can('create', [\App\Models\ProductVariant::class, $product]);
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:50|unique:barcodes,barcode', // سنتحقق من uniqueness مع الشركة لاحقاً
            'price_type' => 'nullable|in:fixed,percentage',
            'price_value' => 'nullable|numeric|min:0',
            'stock' => 'nullable|numeric|min:0',
            'track_stock' => 'nullable|boolean',
            'attributes' => 'nullable|array',
            'image' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'active' => 'nullable|boolean',
        ];
    }
}




// ===== ملف: StoreUserRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->getCompanyId();

        return [
            'name'      => 'required|string|max:255',
            'username'  => 'nullable|string|max:50|unique:users,username',
            'email'     => ['required', 'email', 'max:255',
                            Rule::unique('users', 'email')->where('company_id', $companyId)],
            'password'  => 'required|string|min:8|max:100',
            'phone'     => 'nullable|string|max:20',
            'avatar'    => 'nullable|string',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'job_title' => 'nullable|string|max:100',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'national_id'=> 'nullable|string|max:20',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'role'      => 'nullable|string|exists:roles,name',
            'active'    => 'boolean',
        ];
    }

    private function getCompanyId(): int
    {
        return $this->user()?->current_company_id
            ?? app(\App\Services\CompanyContextService::class)->get();
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



// ===== ملف: UpdateBarcodeRequest.php =====
namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBarcodeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            //
        ];
    }
}




// ===== ملف: UpdateCommercialDocumentRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ كل الحقول sometimes/nullable — التحديث جزئي (PATCH-style)
 * ✅ lines.*.product_id و quantity و unit_price_ht كلها required
 *    فقط إذا أُرسلت lines (الـ Service يتولى الباقي)
 * ✅ document_number لا يُسمح بتغييره بعد الإنشاء
 *    (يتحقق منه beforeUpdate في الـ Service)
 * ══════════════════════════════════════════════════════════════════
 */
class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        return [
            // ── بيانات الوثيقة ────────────────────────────────────────
            'document_type_id'    => 'sometimes|integer|exists:document_types,id',
            'party_id'            => 'sometimes|nullable|integer|exists:parties,id',
            'warehouse_id'        => 'sometimes|nullable|integer|exists:warehouses,id',
            'currency_id'         => 'sometimes|nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'sometimes|nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'sometimes|nullable|integer|exists:numbering_series,id',
            'exchange_rate'       => 'sometimes|nullable|numeric|min:0.0001',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'sometimes|nullable|date',
            'issued_at'      => 'sometimes|nullable|date',
            'due_date'       => 'sometimes|nullable|date',
            'delivery_date'  => 'sometimes|nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'           => 'sometimes|nullable|string|max:2000',
            'internal_notes'  => 'sometimes|nullable|string|max:2000',
            'payment_terms'   => 'sometimes|nullable|array',
            'shipping_info'   => 'sometimes|nullable|array',
            'legal_mentions'  => 'sometimes|nullable|array',
            'is_proforma'     => 'sometimes|nullable|boolean',

            // ── الأسطر (اختياري في التحديث) ──────────────────────────
            'lines'                            => 'sometimes|array|min:1',

            // ✅ required_with:lines — الحقول إلزامية فقط إذا أُرسلت lines
            'lines.*.product_id'               => 'required_with:lines|integer|exists:products,id',
            'lines.*.quantity'                 => 'required_with:lines|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required_with:lines|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.line_attributes'          => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'lines.min'                        => 'إذا أُرسلت الأسطر، يجب أن يكون هناك سطر واحد على الأقل.',
            'lines.*.product_id.required_with' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required_with'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.unit_price_ht.required_with' => 'يجب تحديد السعر لكل سطر.',
        ];
    }
}




// ===== ملف: UpdateCompanyRequest.php =====
// app/Http/Requests/UpdateCompanyRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // الـ route يعتمد slug كـ key (getRouteKeyName = 'slug')
        $company = $this->route('company');
        $companyId = is_object($company) ? $company->id : null;

        $rules = [
            // ── بيانات أساسية ──
            'name'            => 'sometimes|string|max:150',
            'commercial_name' => 'nullable|string|max:150',
            'activity'        => 'nullable|string|max:500',

            // ── تواصل ──
            'email'           => ['nullable', 'email', 'max:100',
                                  Rule::unique('companies', 'email')->ignore($companyId)],
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',

            // ── وثائق قانونية ──
            'nif'             => ['nullable', 'string', 'max:50',
                                  Rule::unique('companies', 'nif')->ignore($companyId)],
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',

            // ── حالة ──
            'active'       => 'nullable|boolean',
        ];

        // ── حقول Super Admin فقط ──────────────────────────────
        if (auth()->user()?->hasRole('super-admin')) {
            $rules = array_merge($rules, [
                'plan'           => ['nullable', 'string', Rule::in(['free', 'starter', 'professional', 'enterprise'])],
                'max_users'      => 'nullable|integer|min:1|max:9999',
                'max_warehouses' => 'nullable|integer|min:1|max:99',
                'max_products'   => 'nullable|integer|min:1|max:999999',
                'notes'          => 'nullable|string|max:2000',
                'trial_ends_at'  => 'nullable|date',
            ]);
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.max'          => 'اسم الشركة يجب ألا يتجاوز 150 حرف',
            'email.unique'      => 'هذا البريد الإلكتروني مستخدم من قبل شركة أخرى',
            'nif.unique'        => 'رقم NIF مستخدم من قبل شركة أخرى',
            'plan.in'           => 'الخطة غير صحيحة، القيم المتاحة: free, starter, professional, enterprise',
            'max_users.min'     => 'يجب أن يكون حد المستخدمين 1 على الأقل',
            'max_products.min'  => 'يجب أن يكون حد المنتجات 1 على الأقل',
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
use Illuminate\Validation\Rule;

/**
 * UpdateProductRequest
 *
 * الإصلاح: نفس إصلاح StoreProductRequest — قواعد unique مقيّدة بـ company_id
 * مع استثناء السجل الحالي (ignore).
 */
class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('product');

        // ✅ company_id من السياق
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'            => 'sometimes|string|max:150',

            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            'slug'    => [
                'sometimes', 'string', 'max:150',
                Rule::unique('products', 'slug')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'ref'     => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'ref')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],
            'barcode' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'barcode')
                    ->ignore($id)
                    ->where('company_id', $companyId),
            ],

            'description'     => 'nullable|string',
            'family_id'       => 'nullable|integer|exists:families,id',
            'brand_id'        => 'nullable|integer|exists:brands,id',
            'product_type_id' => 'sometimes|integer|exists:product_types,id',
            'tva_id'          => 'nullable|integer|exists:tvas,id',
            'unit_id'         => 'nullable|integer|exists:units,id',
            'valuation_method_id' => 'nullable|integer|exists:inventory_valuation_methods,id',
            'images'          => 'nullable|array',
            'images.*'        => 'nullable|string',
            'active'          => 'nullable|boolean',

            'purchase_price_ht'          => 'nullable|numeric|min:0',
            'manages_stock'              => 'nullable|boolean',
            'allow_negative_stock'       => 'nullable|boolean',
            'has_lots'                   => 'nullable|boolean',
            'has_expiration_date'        => 'nullable|boolean',
            'min_stock_alert'            => 'nullable|numeric|min:0',
            'max_stock_alert'            => 'nullable|numeric|min:0',
            'manages_quantity_discounts' => 'nullable|boolean',

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
            // ✅ إصلاح: unique مقيّد بـ company_id + ignore السجل الحالي
            // ملاحظة: لا يمكن استخدام wildcard في ignore مع nested arrays — نتحقق في Service
            'packagings.*.barcode'       => [
                'nullable', 'string', 'max:50',
                Rule::unique('product_packagings', 'barcode')
                    ->where('company_id', $companyId),
            ],
            'packagings.*.is_default'    => 'nullable|boolean',
            'packagings.*.active'        => 'nullable|boolean',
            'packagings.*.display_order' => 'nullable|integer|min:0',

            'prices'                  => 'sometimes|array',
            'prices.*.price_level_id' => 'required_with:prices.*|integer|exists:price_levels,id',
            'prices.*.pricing_method' => 'required_with:prices.*|in:fixed,rate,margin',
            'prices.*.price'          => 'nullable|numeric|min:0',
            'prices.*.rate'           => 'nullable|numeric|min:0',
            'prices.*.margin'         => 'nullable|numeric',
            'prices.*.active'         => 'nullable|boolean',

            'quantity_discounts'                       => 'sometimes|array',
            'quantity_discounts.*.price_level_id'      => 'required_with:quantity_discounts.*|integer|exists:price_levels,id',
            'quantity_discounts.*.min_qty'             => 'required_with:quantity_discounts.*.discount_amount,quantity_discounts.*.discount_percentage|numeric|min:0',
            'quantity_discounts.*.max_qty'             => 'nullable|numeric|min:0|gt:quantity_discounts.*.min_qty',
            'quantity_discounts.*.discount_amount'     => 'nullable|numeric|min:0',
            'quantity_discounts.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'quantity_discounts.*.is_blocked'          => 'nullable|boolean',
            'quantity_discounts.*.active'              => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'ref.unique'                             => 'هذا المرجع مستخدم بالفعل في شركتك',
            'barcode.unique'                         => 'هذا الباركود مستخدم بالفعل في شركتك',
            'slug.unique'                            => 'هذا الـ slug مستخدم بالفعل في شركتك',
            'packagings.*.barcode.unique'            => 'باركود التعبئة مستخدم بالفعل في شركتك',
            'prices.*.pricing_method.in'             => 'طريقة التسعير يجب أن تكون: fixed أو rate أو margin',
            'quantity_discounts.*.max_qty.gt'        => 'الحد الأعلى للكمية يجب أن يكون أكبر من الحد الأدنى',
        ];
    }
}




// ===== ملف: UpdateProductVariantRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('variant'));
    }

    public function rules(): array
    {
        $variantId = $this->route('variant')->id;

        return [
            'sku' => 'nullable|string|max:100|unique:product_variants,sku,' . $variantId,
            'barcode' => 'nullable|string|max:50',
            'price_type' => 'nullable|in:fixed,percentage',
            'price_value' => 'nullable|numeric|min:0',
            'stock' => 'nullable|numeric|min:0',
            'track_stock' => 'nullable|boolean',
            'attributes' => 'nullable|array',
            'image' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'active' => 'nullable|boolean',
        ];
    }
}




// ===== ملف: UpdateProfileRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = auth()->id();

        return [
            'name'      => 'sometimes|string|max:255',
            'username'  => "nullable|string|max:50|unique:users,username,{$userId}",
            'phone'     => 'nullable|string|max:20',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
        ];
    }
}




// ===== ملف: UpdateUserRequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId    = $this->route('user');
        $companyId = $this->getCompanyId();

        return [
            'name'      => 'sometimes|string|max:255',
            'username'  => "nullable|string|max:50|unique:users,username,{$userId}",
            'email'     => ['sometimes', 'email', 'max:255',
                            Rule::unique('users', 'email')->ignore($userId)->where('company_id', $companyId)],
            'password'  => 'sometimes|string|min:8|max:100',
            'phone'     => 'nullable|string|max:20',
            'avatar'    => 'nullable|string',
            'avatar_file'=> 'nullable|image|max:2048',
            'bio'       => 'nullable|string',
            'job_title' => 'nullable|string|max:100',
            'birth_date'=> 'nullable|date',
            'gender_id' => 'nullable|exists:genders,id',
            'national_id'=> 'nullable|string|max:20',
            'address'   => 'nullable|string|max:500',
            'commune_id'=> 'nullable|exists:communes,id',
            'wilaya_id' => 'nullable|exists:wilayas,id',
            'role'      => 'nullable|string|exists:roles,name',
            'active'    => 'boolean',
        ];
    }

    private function getCompanyId(): int
    {
        return $this->user()?->current_company_id
            ?? app(\App\Services\CompanyContextService::class)->get();
    }
}




// ===== ملف: Warehouserequest.php =====
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['required', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم المستودع مطلوب',
            'name.unique'   => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique'   => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}


class UpdateWarehouseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('warehouse');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'name'         => ['sometimes', 'string', 'max:100',
                                Rule::unique('warehouses', 'name')->ignore($id)->where('company_id', $companyId)],
            'code'         => ['nullable', 'string', 'max:20',
                                Rule::unique('warehouses', 'code')->ignore($id)->where('company_id', $companyId)],
            'address'      => 'nullable|string|max:500',
            'wilaya_id'    => 'nullable|integer|exists:wilayas,id',
            'commune_id'   => 'nullable|integer|exists:communes,id',
            'phone'        => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:100',
            'activity'     => 'nullable|string|max:500',
            'rc'           => 'nullable|string|max:50',
            'nif'          => 'nullable|string|max:50',
            'nis'          => 'nullable|string|max:50',
            'ai'           => 'nullable|string|max:50',
            'active'       => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'هذا الاسم مستخدم بالفعل في مستودع آخر',
            'code.unique' => 'هذا الرمز مستخدم بالفعل في مستودع آخر',
        ];
    }
}


