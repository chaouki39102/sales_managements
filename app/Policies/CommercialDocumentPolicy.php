<?php

namespace App\Policies;

use App\Models\CommercialDocument;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentPolicy
{
    use HandlesAuthorization;

    /**
     * الوصول المركزي للمستندات:
     * - أي تاجر يمكنه عرض بيانات المستندات التي أنشأها (view/update_own/delete_own).
     * - الصلاحيات العامة (view_any/update_any/delete_any) تمكّن العمل على كل المستندات.
     * - المستند المقفول (is_locked) لا يمكن تعديله أو حذفه إلا بعد فتحه (unlock).
     */

    public function viewAny(User $user): bool
    {
        return $user->can('view_commercial_document')
            || $user->can('view_any_commercial_document');
    }

    public function view(User $user, CommercialDocument $document): bool
    {
        return $user->can('view_commercial_document')
            || $user->can('view_any_commercial_document')
            || ($user->can('update_own_commercial_document') && $document->created_by === $user->id);
    }

    public function create(User $user): bool
    {
        // لا توجد صلاحية «create_commercial_document» — الإنشاء يُصنّف بيعاً أو شراءً.
        return $user->can('create_sales_document')
            || $user->can('create_purchase_document')
            || $user->can('create_commercial_document');
    }

    public function update(User $user, CommercialDocument $document): bool
    {
        if ($document->is_locked) {
            return false;
        }

        if ($user->can('update_commercial_document')) {
            return true;
        }

        if ($user->can('update_any_commercial_document')) {
            return true;
        }

        return $user->can('update_own_commercial_document')
            && $document->created_by === $user->id;
    }

    public function delete(User $user, CommercialDocument $document): bool
    {
        if ($document->is_locked) {
            return false;
        }

        if ($user->can('delete_commercial_document')) {
            return true;
        }

        // الحذف العام (أي مستند) محجوز للمديرين/المالك داخل الشركة.
        if ($user->can('delete_any_commercial_document')) {
            return $user->isAdminOf($document->company);
        }

        // الحذف الخاص متاح للمنشئ فقط على المستندات غير المصدَّقة (draft/pending).
        if ($user->can('delete_own_commercial_document')) {
            return $document->created_by === $user->id
                && in_array($document->documentStatus?->name ?? '', ['draft', 'pending'], true);
        }

        return false;
    }

    /** صلاحية التحقق من صحة المستند (الموافقة على البيانات قبل التأثير المحاسبي). */
    public function validate(User $user, CommercialDocument $document): bool
    {
        return $user->can('validate_commercial_document');
    }

    /** قفل المستند — منع أي تعديل لاحق. */
    public function lock(User $user, CommercialDocument $document): bool
    {
        return $user->can('lock_commercial_document');
    }

    /** فتح المستند المقفول — خاصة بالمالك فقط. */
    public function unlock(User $user, CommercialDocument $document): bool
    {
        return $user->can('unlock_commercial_document');
    }

    /** إلغاء مستند (مسار الحذف الناعم). */
    public function cancel(User $user, CommercialDocument $document): bool
    {
        return $user->can('cancel_commercial_document');
    }

    /** إنشاء نسخة مكررة من مستند (زر «تكرار»). */
    public function duplicate(User $user, CommercialDocument $document): bool
    {
        return $user->can('duplicate_commercial_document');
    }

    /** إنشاء نسخة/استنساخ من مستند (نسخ للمعالجة اللاحقة). */
    public function clone(User $user, CommercialDocument $document): bool
    {
        return $user->can('clone_commercial_document');
    }

    /** إنشاء مرتجع من مستند (AV/AA من FV/FA). */
    public function return(User $user, CommercialDocument $document): bool
    {
        return $user->can('return_commercial_document');
    }

    /** تحويل المستند إلى نوع آخر (FV ↔ AV, CMD → FV/POS …). */
    public function convert(User $user, CommercialDocument $document): bool
    {
        return $user->can('convert_commercial_document');
    }

    /** تطبيق خصم على المستند/الأسطر. */
    public function applyDiscount(User $user, CommercialDocument $document): bool
    {
        return $user->can('apply_discount_commercial_document');
    }

    /** تغيير أسعار الوحدة على أسطر المستند. */
    public function changePrice(User $user, CommercialDocument $document): bool
    {
        return $user->can('change_price_commercial_document');
    }

    /** تجاوز/تصحيح كميات المخزون المرتبطة بالمستند. */
    public function overrideStock(User $user, CommercialDocument $document): bool
    {
        return $user->can('override_stock_commercial_document');
    }

    /** رؤية سعر التكلفة على أسطر المستند. */
    public function viewCostPrice(User $user, CommercialDocument $document): bool
    {
        return $user->can('view_cost_price');
    }

    /** إضافة دفعة/تسوية دفعة على مستند. */
    public function addPayment(User $user, CommercialDocument $document): bool
    {
        return $user->can('add_payment_commercial_document');
    }

    /** طباعة المستند/الاستلام. */
    public function print(User $user, CommercialDocument $document): bool
    {
        return $user->can('print_commercial_document');
    }
}