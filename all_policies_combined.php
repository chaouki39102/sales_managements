<?php

// دمج تلقائي لكل ملفات الـ policies



// ===== ملف: AttachmentPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AttachmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_attachment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_attachment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_attachment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_attachment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_attachment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_attachment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_attachment');
    }
}



// ===== ملف: AuditPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AuditPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_audit');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_audit');
    }

    public function create(User $user): bool
    {
        return $user->can('create_audit');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_audit');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_audit');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_audit');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_audit');
    }
}



// ===== ملف: BarcodePolicy.php =====
namespace App\Policies;

use App\Models\Barcode;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BarcodePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Barcode $barcode): bool
    {
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Barcode $barcode): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Barcode $barcode): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Barcode $barcode): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Barcode $barcode): bool
    {
        return false;
    }
}




// ===== ملف: BrandPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BrandPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_brand');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_brand');
    }

    public function create(User $user): bool
    {
        return $user->can('create_brand');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_brand');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_brand');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_brand');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_brand');
    }
}



// ===== ملف: CheckPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CheckPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_check');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_check');
    }

    public function create(User $user): bool
    {
        return $user->can('create_check');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_check');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_check');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_check');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_check');
    }
}



// ===== ملف: CommercialDocumentLinePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentLinePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commercial_document_line');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commercial_document_line');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commercial_document_line');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commercial_document_line');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commercial_document_line');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commercial_document_line');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commercial_document_line');
    }
}



// ===== ملف: CommercialDocumentPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commercial_document');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commercial_document');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commercial_document');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commercial_document');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commercial_document');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commercial_document');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commercial_document');
    }
}



// ===== ملف: CommunePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommunePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commune');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commune');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commune');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commune');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commune');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commune');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commune');
    }
}



// ===== ملف: CompanyPolicy.php =====
declare(strict_types=1);

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

/**
 * سياسة الصلاحيات الخاصة بالشركات
 *
 * ملاحظة: صلاحيات Super Admin و Admin تُدار عن طريق Gate::before في AppServiceProvider،
 * لذلك تركز هذه السياسة فقط على المستخدمين العاديين.
 */
class CompanyPolicy
{
    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض قائمة الشركات.
     * العائد true يعني السماح، مع فلترة البيانات حسب صلاحيته في الـ Controller.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه عرض شركة معينة.
     * يسمح إذا كان المستخدم مالكاً أو عضواً نشطاً في الشركة.
     */
    public function view(User $user, Company $company): bool
    {
        return $user->hasAccessToCompany($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه إنشاء شركة جديدة.
     * أي مستخدم مصادق يمكنه إنشاء شركة (يمكن تخصيص القيود لاحقاً).
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه تحديث بيانات الشركة.
     * يسمح للمالك أو للمدير (admin) فقط.
     */
    public function update(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company) || $company->isAdmin($user);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه حذف (إيقاف) الشركة.
     * يسمح فقط للمالك.
     */
    public function delete(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه إدارة أعضاء الشركة (إضافة/إزالة/تغيير دور).
     * يسمح للمالك أو للمدير (admin).
     */
    public function manageMember(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company) || $company->isAdmin($user);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه نقل ملكية الشركة.
     * يسمح فقط للمالك الحالي.
     */
    public function transferOwnership(User $user, Company $company): bool
    {
        return $user->isOwnerOf($company);
    }

    /**
     * تحديد ما إذا كان المستخدم يمكنه تبديل الشركة النشطة (السياق).
     * يسمح لأي مستخدم لديه حق الوصول للشركة (مالك أو عضو نشط).
     */
    public function switch(User $user, Company $company): bool
    {
        return $user->hasAccessToCompany($company);
    }

    /**
     * صلاحية خاصة للسوبر أدمن (تُستخدم في إجراءات الإدارة العليا).
     * مع وجود Gate::before، هذه الدالة قد لا تُستدعى أبداً للسوبر أدمن،
     * لكن نُبقيها للوضوح وللتأكد من عدم السماح لغير السوبر أدمن.
     */
    public function superAdmin(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}




// ===== ملف: CurrencyPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CurrencyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_currency');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_currency');
    }

    public function create(User $user): bool
    {
        return $user->can('create_currency');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_currency');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_currency');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_currency');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_currency');
    }
}



// ===== ملف: DocumentBaseOperationPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentBaseOperationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_base_operation');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_base_operation');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_base_operation');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_base_operation');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_base_operation');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_base_operation');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_base_operation');
    }
}



// ===== ملف: DocumentPaymentPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentPaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_payment');
    }
}



// ===== ملف: DocumentStatusPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentStatusPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_status');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_status');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_status');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_status');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_status');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_status');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_status');
    }
}



// ===== ملف: DocumentTypePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_type');
    }
}



// ===== ملف: EmployeePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmployeePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_employee');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_employee');
    }

    public function create(User $user): bool
    {
        return $user->can('create_employee');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_employee');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_employee');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_employee');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_employee');
    }
}



// ===== ملف: EmploymentContractPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmploymentContractPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_employment_contract');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_employment_contract');
    }

    public function create(User $user): bool
    {
        return $user->can('create_employment_contract');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_employment_contract');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_employment_contract');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_employment_contract');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_employment_contract');
    }
}



// ===== ملف: ExchangeRatePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExchangeRatePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_exchange_rate');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_exchange_rate');
    }

    public function create(User $user): bool
    {
        return $user->can('create_exchange_rate');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_exchange_rate');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_exchange_rate');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_exchange_rate');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_exchange_rate');
    }
}



// ===== ملف: ExpenseCategoryPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpenseCategoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense_category');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense_category');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense_category');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense_category');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense_category');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense_category');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense_category');
    }
}



// ===== ملف: ExpensePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_expense');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_expense');
    }

    public function create(User $user): bool
    {
        return $user->can('create_expense');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_expense');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_expense');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_expense');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_expense');
    }
}



// ===== ملف: FamilyPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FamilyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_family');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_family');
    }

    public function create(User $user): bool
    {
        return $user->can('create_family');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_family');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_family');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_family');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_family');
    }
}



// ===== ملف: FiscalStampPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FiscalStampPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_fiscal_stamp');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_fiscal_stamp');
    }

    public function create(User $user): bool
    {
        return $user->can('create_fiscal_stamp');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_fiscal_stamp');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_fiscal_stamp');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_fiscal_stamp');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_fiscal_stamp');
    }
}



// ===== ملف: FiscalYearPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\Log;

class FiscalYearPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_any_fiscal_year') || $user->can('manage_fiscal_year');
    }

    public function create(User $user): bool
    {
        Log::info('FiscalYearPolicy::create', [
            'user_id' => $user->id,
            'roles' => $user->getRoleNames(),
            'can_manage' => $user->can('manage_fiscal_year'),
        ]);
        return $user->can('manage_fiscal_year');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('manage_fiscal_year');
    }
}




// ===== ملف: GenderPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class GenderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_gender');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_gender');
    }

    public function create(User $user): bool
    {
        return $user->can('create_gender');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_gender');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_gender');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_gender');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_gender');
    }
}



// ===== ملف: InventoryValuationMethodPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryValuationMethodPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_inventory_valuation_method');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_inventory_valuation_method');
    }

    public function create(User $user): bool
    {
        return $user->can('create_inventory_valuation_method');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_inventory_valuation_method');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_inventory_valuation_method');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_inventory_valuation_method');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_inventory_valuation_method');
    }
}



// ===== ملف: LegalFormPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LegalFormPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_legal_form');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_legal_form');
    }

    public function create(User $user): bool
    {
        return $user->can('create_legal_form');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_legal_form');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_legal_form');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_legal_form');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_legal_form');
    }
}



// ===== ملف: NotificationPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NotificationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_notification');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_notification');
    }

    public function create(User $user): bool
    {
        return $user->can('create_notification');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_notification');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_notification');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_notification');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_notification');
    }
}



// ===== ملف: NumberingSeriesPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NumberingSeriesPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_numbering_series');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_numbering_series');
    }

    public function create(User $user): bool
    {
        return $user->can('create_numbering_series');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_numbering_series');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_numbering_series');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_numbering_series');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_numbering_series');
    }
}



// ===== ملف: OpeningBalancePartyPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalancePartyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_opening_balance_party');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_opening_balance_party');
    }

    public function create(User $user): bool
    {
        return $user->can('create_opening_balance_party');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_opening_balance_party');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_opening_balance_party');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_opening_balance_party');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_opening_balance_party');
    }
}



// ===== ملف: OpeningBalanceStockPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalanceStockPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_opening_balance_stock');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_opening_balance_stock');
    }

    public function create(User $user): bool
    {
        return $user->can('create_opening_balance_stock');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_opening_balance_stock');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_opening_balance_stock');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_opening_balance_stock');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_opening_balance_stock');
    }
}



// ===== ملف: PartyPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartyPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_party');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_party');
    }

    public function create(User $user): bool
    {
        return $user->can('create_party');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_party');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_party');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_party');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_party');
    }
}



// ===== ملف: PartyTypePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartyTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_party_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_party_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_party_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_party_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_party_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_party_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_party_type');
    }
}



// ===== ملف: PaymentModePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentModePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment_mode');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment_mode');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment_mode');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment_mode');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment_mode');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment_mode');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment_mode');
    }
}



// ===== ملف: PaymentPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_payment');
    }
}



// ===== ملف: PermissionPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PermissionPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_permission');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_permission');
    }

    public function create(User $user): bool
    {
        return $user->can('create_permission');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_permission');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_permission');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_permission');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_permission');
    }
}



// ===== ملف: PriceLevelPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PriceLevelPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_price_level');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_price_level');
    }

    public function create(User $user): bool
    {
        return $user->can('create_price_level');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_price_level');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_price_level');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_price_level');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_price_level');
    }
}



// ===== ملف: ProductLotPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductLotPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_lot');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_lot');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_lot');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_lot');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_lot');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_lot');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_lot');
    }
}



// ===== ملف: ProductPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product');
    }
}



// ===== ملف: ProductTypePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_type');
    }
}



// ===== ملف: ProductVariantPolicy.php =====
namespace App\Policies;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

class ProductVariantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function create(User $user, Product $product): bool
    {
        return $user->hasAccessToCompany($product->company_id);
    }

    public function update(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }

    public function delete(User $user, ProductVariant $variant): bool
    {
        return $user->hasAccessToCompany($variant->company_id);
    }
}




// ===== ملف: QuantityDiscountPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class QuantityDiscountPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_quantity_discount');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_quantity_discount');
    }

    public function create(User $user): bool
    {
        return $user->can('create_quantity_discount');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_quantity_discount');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_quantity_discount');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_quantity_discount');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_quantity_discount');
    }
}



// ===== ملف: RolePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RolePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_role');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_role');
    }

    public function create(User $user): bool
    {
        return $user->can('create_role');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_role');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_role');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_role');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_role');
    }
}



// ===== ملف: SettingPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_setting');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_setting');
    }

    public function create(User $user): bool
    {
        return $user->can('create_setting');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_setting');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_setting');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_setting');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_setting');
    }
}



// ===== ملف: StockMovementPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class StockMovementPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_stock_movement');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_stock_movement');
    }

    public function create(User $user): bool
    {
        return $user->can('create_stock_movement');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_stock_movement');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_stock_movement');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_stock_movement');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_stock_movement');
    }
}



// ===== ملف: StockMovementTypePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class StockMovementTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_stock_movement_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_stock_movement_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_stock_movement_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_stock_movement_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_stock_movement_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_stock_movement_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_stock_movement_type');
    }
}



// ===== ملف: TreasuryAccountPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TreasuryAccountPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_treasury_account');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_treasury_account');
    }

    public function create(User $user): bool
    {
        return $user->can('create_treasury_account');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_treasury_account');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_treasury_account');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_treasury_account');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_treasury_account');
    }
}



// ===== ملف: TreasuryAccountTypePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TreasuryAccountTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_treasury_account_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_treasury_account_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_treasury_account_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_treasury_account_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_treasury_account_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_treasury_account_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_treasury_account_type');
    }
}



// ===== ملف: TvaPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TvaPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_tva');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_tva');
    }

    public function create(User $user): bool
    {
        return $user->can('create_tva');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_tva');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_tva');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_tva');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_tva');
    }
}



// ===== ملف: UnitPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UnitPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_unit');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_unit');
    }

    public function create(User $user): bool
    {
        return $user->can('create_unit');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_unit');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_unit');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_unit');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_unit');
    }
}



// ===== ملف: UserPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_user');
    }

    public function view(User $user, User $model): bool
    {
        return $user->can('view_user');
    }

    public function create(User $user): bool
    {
        return $user->can('create_user');
    }

    public function update(User $user, User $model): bool
    {
        return $user->can('update_user');
    }

    public function delete(User $user, User $model): bool
    {
        return $user->can('delete_user');
    }

    public function restore(User $user, User $model): bool
    {
        return $user->can('restore_user');
    }

    public function forceDelete(User $user, User $model): bool
    {
        return $user->can('force_delete_user');
    }
}



// ===== ملف: WarehousePolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WarehousePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_warehouse');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_warehouse');
    }

    public function create(User $user): bool
    {
        return $user->can('create_warehouse');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_warehouse');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_warehouse');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_warehouse');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_warehouse');
    }
}



// ===== ملف: WilayaPolicy.php =====
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WilayaPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_wilaya');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_wilaya');
    }

    public function create(User $user): bool
    {
        return $user->can('create_wilaya');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_wilaya');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_wilaya');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_wilaya');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_wilaya');
    }
}

