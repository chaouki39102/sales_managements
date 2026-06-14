<?php

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
