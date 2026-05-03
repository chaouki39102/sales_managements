<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * RolesAndPermissionsSeeder — النسخة الشاملة
 *
 * الأدوار:
 *  ① super-admin   → مدير النظام الكامل (فوق كل شيء — Gate::before)
 *  ② admin         → مدير الشركة (كل صلاحيات الشركة)
 *  ③ manager       → مدير عمليات (مبيعات + مشتريات + مخزون + تقارير)
 *  ④ accountant    → محاسب (مستندات + مدفوعات + تقارير مالية)
 *  ⑤ salesperson   → بائع (مستندات بيع + عملاء + مخزون قراءة)
 *  ⑥ warehouse     → أمين مخزن (مخزون + حركات فقط)
 *  ⑦ viewer        → مشاهد (قراءة فقط — لا كتابة)
 *
 * المجموعات:
 *  - المستخدمون      - الأطراف         - المنتجات
 *  - المستودعات      - المستندات       - المدفوعات
 *  - الشيكات         - المصروفات       - الخزينة
 *  - المخزون         - الموظفون        - التقارير
 *  - الإعدادات       - الأدوار         - الشركة
 */
class RolesAndPermissionsSeeder extends Seeder
{
    // ═══════════════════════════════════════════
    // تعريف كل الصلاحيات مجمّعة
    // ═══════════════════════════════════════════
    private function getPermissions(): array
    {
        return [

            // ══════════════════════════════════
            // 1. المستخدمون
            // ══════════════════════════════════
           
            [
                'name'         => 'view_any_user',
                'display_name' => 'عرض قائمة المستخدمين',
                'group'        => 'المستخدمون',
                'description'  => 'عرض قائمة جميع مستخدمي الشركة',
            ],
            [
                'name'         => 'view_user',
                'display_name' => 'عرض مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'عرض تفاصيل مستخدم واحد',
            ],
            [
                'name'         => 'create_user',
                'display_name' => 'إنشاء مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'إضافة مستخدم جديد للشركة',
            ],
            [
                'name'         => 'update_user',
                'display_name' => 'تعديل مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تعديل بيانات مستخدم موجود',
            ],
            [
                'name'         => 'delete_user',
                'display_name' => 'حذف مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'حذف مستخدم من الشركة (حذف مؤقت)',
            ],
            [
                'name'         => 'restore_user',
                'display_name' => 'استعادة مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'استعادة مستخدم محذوف',
            ],
            [
                'name'         => 'force_delete_user',
                'display_name' => 'حذف نهائي لمستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'الحذف النهائي غير القابل للاستعادة',
            ],
            [
                'name'         => 'toggle_active_user',
                'display_name' => 'تفعيل/تعطيل مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تفعيل أو تعطيل حساب مستخدم',
            ],
            [
                'name'         => 'change_password_user',
                'display_name' => 'تغيير كلمة مرور مستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تغيير كلمة مرور أي مستخدم',
            ],
            [
                'name'         => 'assign_role_user',
                'display_name' => 'تعيين دور لمستخدم',
                'group'        => 'المستخدمون',
                'description'  => 'تعيين أو تغيير دور مستخدم في الشركة',
            ],

            // ══════════════════════════════════
            // 2. الأطراف (عملاء / موردون)
            // ══════════════════════════════════
            [
                'name'         => 'view_any_party',
                'display_name' => 'عرض قائمة الأطراف',
                'group'        => 'الأطراف',
                'description'  => 'عرض قائمة العملاء والموردين',
            ],
            [
                'name'         => 'view_party',
                'display_name' => 'عرض طرف',
                'group'        => 'الأطراف',
                'description'  => 'عرض تفاصيل عميل أو مورد',
            ],
            [
                'name'         => 'create_party',
                'display_name' => 'إنشاء طرف',
                'group'        => 'الأطراف',
                'description'  => 'إضافة عميل أو مورد جديد',
            ],
            [
                'name'         => 'update_party',
                'display_name' => 'تعديل طرف',
                'group'        => 'الأطراف',
                'description'  => 'تعديل بيانات عميل أو مورد',
            ],
            [
                'name'         => 'delete_party',
                'display_name' => 'حذف طرف',
                'group'        => 'الأطراف',
                'description'  => 'حذف عميل أو مورد',
            ],
            [
                'name'         => 'restore_party',
                'display_name' => 'استعادة طرف',
                'group'        => 'الأطراف',
                'description'  => 'استعادة عميل أو مورد محذوف',
            ],
            [
                'name'         => 'force_delete_party',
                'display_name' => 'حذف نهائي لطرف',
                'group'        => 'الأطراف',
                'description'  => 'الحذف النهائي لعميل أو مورد',
            ],

            // ══════════════════════════════════
            // 3. المنتجات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_product',
                'display_name' => 'عرض قائمة المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'عرض قائمة جميع المنتجات',
            ],
            [
                'name'         => 'view_product',
                'display_name' => 'عرض منتج',
                'group'        => 'المنتجات',
                'description'  => 'عرض تفاصيل منتج واحد',
            ],
            [
                'name'         => 'create_product',
                'display_name' => 'إنشاء منتج',
                'group'        => 'المنتجات',
                'description'  => 'إضافة منتج جديد',
            ],
            [
                'name'         => 'update_product',
                'display_name' => 'تعديل منتج',
                'group'        => 'المنتجات',
                'description'  => 'تعديل بيانات منتج موجود',
            ],
            [
                'name'         => 'delete_product',
                'display_name' => 'حذف منتج',
                'group'        => 'المنتجات',
                'description'  => 'حذف منتج',
            ],
            [
                'name'         => 'restore_product',
                'display_name' => 'استعادة منتج',
                'group'        => 'المنتجات',
                'description'  => 'استعادة منتج محذوف',
            ],
            [
                'name'         => 'manage_product_prices',
                'display_name' => 'إدارة أسعار المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'تعديل أسعار المنتجات وتعريفاتها',
            ],
            [
                'name'         => 'manage_product_variants',
                'display_name' => 'إدارة متغيرات المنتجات',
                'group'        => 'المنتجات',
                'description'  => 'إدارة متغيرات وتعبئة المنتجات',
            ],
            [
                'name'         => 'manage_barcodes',
                'display_name' => 'إدارة الباركود',
                'group'        => 'المنتجات',
                'description'  => 'إضافة وتعديل وحذف الباركود',
            ],

            // ══════════════════════════════════
            // 4. المستودعات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_warehouse',
                'display_name' => 'عرض قائمة المستودعات',
                'group'        => 'المستودعات',
                'description'  => 'عرض قائمة جميع المستودعات',
            ],
            [
                'name'         => 'view_warehouse',
                'display_name' => 'عرض مستودع',
                'group'        => 'المستودعات',
                'description'  => 'عرض تفاصيل مستودع',
            ],
            [
                'name'         => 'create_warehouse',
                'display_name' => 'إنشاء مستودع',
                'group'        => 'المستودعات',
                'description'  => 'إضافة مستودع جديد',
            ],
            [
                'name'         => 'update_warehouse',
                'display_name' => 'تعديل مستودع',
                'group'        => 'المستودعات',
                'description'  => 'تعديل بيانات مستودع',
            ],
            [
                'name'         => 'delete_warehouse',
                'display_name' => 'حذف مستودع',
                'group'        => 'المستودعات',
                'description'  => 'حذف مستودع',
            ],

            // ══════════════════════════════════
            // 5. المستندات التجارية
            // ══════════════════════════════════
            [
                'name'         => 'view_any_commercial_document',
                'display_name' => 'عرض قائمة المستندات',
                'group'        => 'المستندات',
                'description'  => 'عرض قائمة جميع المستندات التجارية',
            ],
            [
                'name'         => 'view_commercial_document',
                'display_name' => 'عرض مستند',
                'group'        => 'المستندات',
                'description'  => 'عرض تفاصيل مستند تجاري',
            ],
            [
                'name'         => 'create_sales_document',
                'display_name' => 'إنشاء مستند بيع',
                'group'        => 'المستندات',
                'description'  => 'إنشاء فاتورة بيع أو عرض سعر أو وصل تسليم',
            ],
            [
                'name'         => 'create_purchase_document',
                'display_name' => 'إنشاء مستند شراء',
                'group'        => 'المستندات',
                'description'  => 'إنشاء فاتورة شراء أو أمر شراء',
            ],
            [
                'name'         => 'update_commercial_document',
                'display_name' => 'تعديل مستند',
                'group'        => 'المستندات',
                'description'  => 'تعديل مستند تجاري غير مؤكد',
            ],
            [
                'name'         => 'delete_commercial_document',
                'display_name' => 'حذف مستند',
                'group'        => 'المستندات',
                'description'  => 'حذف مستند تجاري',
            ],
            [
                'name'         => 'validate_commercial_document',
                'display_name' => 'تأكيد مستند',
                'group'        => 'المستندات',
                'description'  => 'تأكيد وإقفال مستند تجاري',
            ],
            [
                'name'         => 'lock_commercial_document',
                'display_name' => 'قفل/فتح مستند',
                'group'        => 'المستندات',
                'description'  => 'قفل أو فتح مستند تجاري',
            ],
            [
                'name'         => 'cancel_commercial_document',
                'display_name' => 'إلغاء مستند',
                'group'        => 'المستندات',
                'description'  => 'إلغاء مستند تجاري',
            ],
            [
                'name'         => 'manage_numbering_series',
                'display_name' => 'إدارة سلاسل الترقيم',
                'group'        => 'المستندات',
                'description'  => 'إدارة سلاسل ترقيم المستندات',
            ],

            // ══════════════════════════════════
            // 6. المدفوعات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_payment',
                'display_name' => 'عرض قائمة المدفوعات',
                'group'        => 'المدفوعات',
                'description'  => 'عرض قائمة جميع المدفوعات',
            ],
            [
                'name'         => 'view_payment',
                'display_name' => 'عرض دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'عرض تفاصيل دفعة واحدة',
            ],
            [
                'name'         => 'create_payment',
                'display_name' => 'إنشاء دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'تسجيل دفعة جديدة',
            ],
            [
                'name'         => 'update_payment',
                'display_name' => 'تعديل دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'تعديل بيانات دفعة',
            ],
            [
                'name'         => 'delete_payment',
                'display_name' => 'حذف دفعة',
                'group'        => 'المدفوعات',
                'description'  => 'حذف دفعة',
            ],

            // ══════════════════════════════════
            // 7. الشيكات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_check',
                'display_name' => 'عرض قائمة الشيكات',
                'group'        => 'الشيكات',
                'description'  => 'عرض قائمة جميع الشيكات',
            ],
            [
                'name'         => 'view_check',
                'display_name' => 'عرض شيك',
                'group'        => 'الشيكات',
                'description'  => 'عرض تفاصيل شيك',
            ],
            [
                'name'         => 'create_check',
                'display_name' => 'إنشاء شيك',
                'group'        => 'الشيكات',
                'description'  => 'تسجيل شيك جديد',
            ],
            [
                'name'         => 'update_check',
                'display_name' => 'تعديل شيك',
                'group'        => 'الشيكات',
                'description'  => 'تعديل بيانات شيك',
            ],
            [
                'name'         => 'delete_check',
                'display_name' => 'حذف شيك',
                'group'        => 'الشيكات',
                'description'  => 'حذف شيك',
            ],
            [
                'name'         => 'manage_check_status',
                'display_name' => 'إدارة حالة الشيكات',
                'group'        => 'الشيكات',
                'description'  => 'تحديث حالة الشيك (صُرف / مرتجع)',
            ],

            // ══════════════════════════════════
            // 8. المصروفات
            // ══════════════════════════════════
            [
                'name'         => 'view_any_expense',
                'display_name' => 'عرض قائمة المصروفات',
                'group'        => 'المصروفات',
                'description'  => 'عرض قائمة جميع المصروفات',
            ],
            [
                'name'         => 'view_expense',
                'display_name' => 'عرض مصروف',
                'group'        => 'المصروفات',
                'description'  => 'عرض تفاصيل مصروف',
            ],
            [
                'name'         => 'create_expense',
                'display_name' => 'إنشاء مصروف',
                'group'        => 'المصروفات',
                'description'  => 'تسجيل مصروف جديد',
            ],
            [
                'name'         => 'update_expense',
                'display_name' => 'تعديل مصروف',
                'group'        => 'المصروفات',
                'description'  => 'تعديل بيانات مصروف',
            ],
            [
                'name'         => 'delete_expense',
                'display_name' => 'حذف مصروف',
                'group'        => 'المصروفات',
                'description'  => 'حذف مصروف',
            ],

            // ══════════════════════════════════
            // 9. الخزينة
            // ══════════════════════════════════
            [
                'name'         => 'view_any_treasury_account',
                'display_name' => 'عرض قائمة حسابات الخزينة',
                'group'        => 'الخزينة',
                'description'  => 'عرض قائمة جميع حسابات الخزينة والبنوك',
            ],
            [
                'name'         => 'view_treasury_account',
                'display_name' => 'عرض حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'عرض تفاصيل حساب خزينة',
            ],
            [
                'name'         => 'create_treasury_account',
                'display_name' => 'إنشاء حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'إضافة حساب خزينة أو بنك جديد',
            ],
            [
                'name'         => 'update_treasury_account',
                'display_name' => 'تعديل حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'تعديل بيانات حساب خزينة',
            ],
            [
                'name'         => 'delete_treasury_account',
                'display_name' => 'حذف حساب خزينة',
                'group'        => 'الخزينة',
                'description'  => 'حذف حساب خزينة',
            ],

            // ══════════════════════════════════
            // 10. المخزون وحركاته
            // ══════════════════════════════════
            [
                'name'         => 'view_any_stock_movement',
                'display_name' => 'عرض حركات المخزون',
                'group'        => 'المخزون',
                'description'  => 'عرض قائمة حركات المخزون',
            ],
            [
                'name'         => 'view_stock_movement',
                'display_name' => 'عرض حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'عرض تفاصيل حركة مخزون',
            ],
            [
                'name'         => 'create_stock_movement',
                'display_name' => 'إنشاء حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'تسجيل حركة مخزون يدوية',
            ],
            [
                'name'         => 'delete_stock_movement',
                'display_name' => 'حذف حركة مخزون',
                'group'        => 'المخزون',
                'description'  => 'حذف حركة مخزون',
            ],
            [
                'name'         => 'view_any_product_lot',
                'display_name' => 'عرض دفعات المنتجات',
                'group'        => 'المخزون',
                'description'  => 'عرض قائمة دفعات (Lots) المنتجات',
            ],
            [
                'name'         => 'manage_product_lot',
                'display_name' => 'إدارة دفعات المنتجات',
                'group'        => 'المخزون',
                'description'  => 'إضافة وتعديل وحذف دفعات المنتجات',
            ],
            [
                'name'         => 'manage_opening_balances',
                'display_name' => 'إدارة الأرصدة الافتتاحية',
                'group'        => 'المخزون',
                'description'  => 'إدارة أرصدة المخزون والأطراف الافتتاحية',
            ],

            // ══════════════════════════════════
            // 11. الموظفون
            // ══════════════════════════════════
            [
                'name'         => 'view_any_employee',
                'display_name' => 'عرض قائمة الموظفين',
                'group'        => 'الموظفون',
                'description'  => 'عرض قائمة جميع الموظفين',
            ],
            [
                'name'         => 'view_employee',
                'display_name' => 'عرض موظف',
                'group'        => 'الموظفون',
                'description'  => 'عرض تفاصيل موظف',
            ],
            [
                'name'         => 'create_employee',
                'display_name' => 'إنشاء موظف',
                'group'        => 'الموظفون',
                'description'  => 'إضافة موظف جديد',
            ],
            [
                'name'         => 'update_employee',
                'display_name' => 'تعديل موظف',
                'group'        => 'الموظفون',
                'description'  => 'تعديل بيانات موظف',
            ],
            [
                'name'         => 'delete_employee',
                'display_name' => 'حذف موظف',
                'group'        => 'الموظفون',
                'description'  => 'حذف موظف',
            ],
            [
                'name'         => 'manage_employment_contracts',
                'display_name' => 'إدارة عقود العمل',
                'group'        => 'الموظفون',
                'description'  => 'إدارة عقود عمل الموظفين',
            ],

            // ══════════════════════════════════
            // 12. التقارير
            // ══════════════════════════════════
            [
                'name'         => 'view_sales_report',
                'display_name' => 'تقرير المبيعات',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المبيعات',
            ],
            [
                'name'         => 'view_purchase_report',
                'display_name' => 'تقرير المشتريات',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المشتريات',
            ],
            [
                'name'         => 'view_inventory_report',
                'display_name' => 'تقرير المخزون',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير المخزون والحركات',
            ],
            [
                'name'         => 'view_financial_report',
                'display_name' => 'التقارير المالية',
                'group'        => 'التقارير',
                'description'  => 'عرض التقارير المالية (مدفوعات، ضرائب، خزينة)',
            ],
            [
                'name'         => 'view_party_report',
                'display_name' => 'تقارير الأطراف',
                'group'        => 'التقارير',
                'description'  => 'عرض تقارير العملاء والموردين',
            ],
            [
                'name'         => 'view_dashboard',
                'display_name' => 'عرض لوحة التحكم',
                'group'        => 'التقارير',
                'description'  => 'الوصول للوحة التحكم والإحصاءات العامة',
            ],

            // ══════════════════════════════════
            // 13. السنوات المالية
            // ══════════════════════════════════
            [
                'name'         => 'view_any_fiscal_year',
                'display_name' => 'عرض السنوات المالية',
                'group'        => 'السنوات المالية',
                'description'  => 'عرض قائمة السنوات المالية',
            ],
            [
                'name'         => 'manage_fiscal_year',
                'display_name' => 'إدارة السنوات المالية',
                'group'        => 'السنوات المالية',
                'description'  => 'إنشاء وتعديل وإقفال السنوات المالية',
            ],

            // ══════════════════════════════════
            // 14. الإعدادات
            // ══════════════════════════════════
            [
                'name'         => 'manage_settings',
                'display_name' => 'إدارة الإعدادات',
                'group'        => 'الإعدادات',
                'description'  => 'تعديل إعدادات الشركة العامة',
            ],
            [
                'name'         => 'manage_lookups',
                'display_name' => 'إدارة جداول البحث',
                'group'        => 'الإعدادات',
                'description'  => 'إدارة العملات، الوحدات، أصناف المصروفات، إلخ',
            ],
            [
                'name'         => 'manage_attachments',
                'display_name' => 'إدارة المرفقات',
                'group'        => 'الإعدادات',
                'description'  => 'رفع وحذف المرفقات',
            ],
            [
                'name'         => 'view_audit_log',
                'display_name' => 'عرض سجل المراجعة',
                'group'        => 'الإعدادات',
                'description'  => 'عرض سجل العمليات والتعديلات',
            ],

            // ══════════════════════════════════
            // 15. الأدوار والصلاحيات
            // ══════════════════════════════════
            [
                'name'         => 'view_roles',
                'display_name' => 'عرض الأدوار',
                'group'        => 'الأدوار',
                'description'  => 'عرض الأدوار والصلاحيات المرتبطة',
            ],
            [
                'name'         => 'manage_roles',
                'display_name' => 'إدارة الأدوار',
                'group'        => 'الأدوار',
                'description'  => 'إنشاء وتعديل وحذف الأدوار وصلاحياتها',
            ],

            // ══════════════════════════════════
            // 16. الشركة
            // ══════════════════════════════════
            [
                'name'         => 'view_company',
                'display_name' => 'عرض الشركة',
                'group'        => 'الشركة',
                'description'  => 'عرض بيانات الشركة الحالية',
            ],
            [
                'name'         => 'update_company',
                'display_name' => 'تعديل الشركة',
                'group'        => 'الشركة',
                'description'  => 'تعديل بيانات الشركة الأساسية',
            ],
            [
                'name'         => 'manage_company_members',
                'display_name' => 'إدارة أعضاء الشركة',
                'group'        => 'الشركة',
                'description'  => 'إضافة وإزالة الأعضاء وتغيير أدوارهم',
            ],
            [
                'name'         => 'transfer_ownership',
                'display_name' => 'نقل ملكية الشركة',
                'group'        => 'الشركة',
                'description'  => 'نقل ملكية الشركة لمستخدم آخر',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // تعريف صلاحيات كل دور
    // ═══════════════════════════════════════════

    private function getRolePermissions(): array
    {
        return [

            // ── admin: كل صلاحيات الشركة ────────────────────────
            'admin' => [
                // مستخدمون
                'view_any_user', 'view_user', 'create_user', 'update_user',
                'delete_user', 'restore_user', 'force_delete_user',
                'toggle_active_user', 'change_password_user', 'assign_role_user',
                // أطراف
                'view_any_party', 'view_party', 'create_party', 'update_party',
                'delete_party', 'restore_party', 'force_delete_party',
                // منتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'restore_product', 'manage_product_prices',
                'manage_product_variants', 'manage_barcodes',
                // مستودعات
                'view_any_warehouse', 'view_warehouse', 'create_warehouse',
                'update_warehouse', 'delete_warehouse',
                // مستندات
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'manage_numbering_series',
                // مدفوعات
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // شيكات
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // مصروفات
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // خزينة
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account', 'delete_treasury_account',
                // مخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'delete_stock_movement', 'view_any_product_lot', 'manage_product_lot',
                'manage_opening_balances',
                // موظفون
                'view_any_employee', 'view_employee', 'create_employee', 'update_employee',
                'delete_employee', 'manage_employment_contracts',
                // تقارير
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // سنوات مالية
                'view_any_fiscal_year', 'manage_fiscal_year',
                // إعدادات
                'manage_settings', 'manage_lookups', 'manage_attachments', 'view_audit_log',
                // أدوار
                'view_roles', 'manage_roles',
                // شركة
                'view_company', 'update_company', 'manage_company_members', 'transfer_ownership',
            ],

            // ── manager: عمليات بدون إدارة مستخدمين وإعدادات ────
            'manager' => [
                // مستخدمون (قراءة فقط)
                'view_any_user', 'view_user',
                // أطراف (كاملة)
                'view_any_party', 'view_party', 'create_party', 'update_party', 'delete_party',
                // منتجات (كاملة)
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'manage_product_prices', 'manage_product_variants', 'manage_barcodes',
                // مستودعات (قراءة + تعديل)
                'view_any_warehouse', 'view_warehouse', 'update_warehouse',
                // مستندات (كاملة)
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document',
                // مدفوعات
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment',
                // شيكات
                'view_any_check', 'view_check', 'create_check', 'update_check', 'manage_check_status',
                // مصروفات
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense',
                // خزينة (قراءة)
                'view_any_treasury_account', 'view_treasury_account',
                // مخزون (كاملة)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // موظفون (قراءة)
                'view_any_employee', 'view_employee',
                // تقارير (كاملة)
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // سنوات مالية (قراءة)
                'view_any_fiscal_year',
                // إعدادات
                'manage_lookups', 'manage_attachments',
                // أدوار (قراءة)
                'view_roles',
                // شركة (قراءة)
                'view_company',
            ],

            // ── accountant: مالي بحت ─────────────────────────────
            'accountant' => [
                // أطراف (قراءة)
                'view_any_party', 'view_party',
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات (قراءة + تأكيد)
                'view_any_commercial_document', 'view_commercial_document',
                'validate_commercial_document',
                // مدفوعات (كاملة)
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment', 'delete_payment',
                // شيكات (كاملة)
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // مصروفات (كاملة)
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense', 'delete_expense',
                // خزينة (كاملة)
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                // مخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                // تقارير مالية
                'view_sales_report', 'view_purchase_report', 'view_financial_report',
                'view_party_report', 'view_dashboard',
                // سنوات مالية (قراءة)
                'view_any_fiscal_year',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── salesperson: بيع فقط ─────────────────────────────
            'salesperson' => [
                // أطراف (عملاء: قراءة + إنشاء)
                'view_any_party', 'view_party', 'create_party', 'update_party',
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات بيع فقط
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'update_commercial_document',
                // مدفوعات (قراءة + إنشاء)
                'view_any_payment', 'view_payment', 'create_payment',
                // مخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement',
                // تقارير مبيعات
                'view_sales_report', 'view_party_report', 'view_dashboard',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── warehouse: أمين مخزن ─────────────────────────────
            'warehouse' => [
                // منتجات (قراءة)
                'view_any_product', 'view_product',
                // مستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات (قراءة)
                'view_any_commercial_document', 'view_commercial_document',
                // مخزون (كاملة)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // تقارير مخزون
                'view_inventory_report', 'view_dashboard',
                // مرفقات
                'manage_attachments',
                // شركة (قراءة)
                'view_company',
            ],

            // ── viewer: مشاهد فقط ────────────────────────────────
            'viewer' => [
                'view_any_party', 'view_party',
                'view_any_product', 'view_product',
                'view_any_warehouse', 'view_warehouse',
                'view_any_commercial_document', 'view_commercial_document',
                'view_any_payment', 'view_payment',
                'view_any_check', 'view_check',
                'view_any_expense', 'view_expense',
                'view_any_treasury_account', 'view_treasury_account',
                'view_any_stock_movement', 'view_stock_movement',
                'view_any_product_lot',
                'view_any_employee', 'view_employee',
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                'view_any_fiscal_year',
                'view_roles',
                'view_company',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // تعريف الأدوار مع بياناتها
    // ═══════════════════════════════════════════
    private function getRoles(): array
    {
        return [
            [
                'name'         => 'super-admin',
                'display_name' => 'مدير النظام',
                'description'  => 'صلاحيات كاملة على كل شيء — يتجاوز كل القيود (Gate::before)',
            ],
            [
                'name'         => 'admin',
                'display_name' => 'مدير الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'محاسب',
                'description'  => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية',
            ],
            [
                'name'         => 'salesperson',
                'display_name' => 'بائع',
                'description'  => 'إنشاء مستندات البيع وإدارة العملاء',
            ],
            [
                'name'         => 'warehouse',
                'display_name' => 'أمين المخزن',
                'description'  => 'إدارة المخزون وحركاته',
            ],
            [
                'name'         => 'viewer',
                'display_name' => 'مشاهد',
                'description'  => 'قراءة فقط بدون أي صلاحيات كتابة',
            ],
        ];
    }

    // ═══════════════════════════════════════════
    // run()
    // ═══════════════════════════════════════════
    public function run(): void
    {
        // 1. مسح كاش الصلاحيات
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. إنشاء الصلاحيات
        $permissions = $this->getPermissions();
        foreach ($permissions as $perm) {
            if (!is_array($perm) || !isset($perm['name'])) continue;
            Permission::firstOrCreate(
                ['name' => $perm['name'], 'guard_name' => 'web'],
                [
                    'display_name' => $perm['display_name'] ?? $perm['name'],
                    'group'        => $perm['group'] ?? 'عام',
                    'description'  => $perm['description'] ?? '',
                ]
            );
        }

        $this->command->info('✅ تم إنشاء ' . Permission::count() . ' صلاحية');

        // 3. إنشاء الأدوار
        foreach ($this->getRoles() as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name'], 'guard_name' => 'web'],
                [
                    'display_name' => $roleData['display_name'],
                    'description'  => $roleData['description'] ?? '',
                ]
            );
        }

        $this->command->info('✅ تم إنشاء ' . Role::count() . ' أدوار');

        // 4. تعيين الصلاحيات للأدوار
        $rolePermissions = $this->getRolePermissions();

        // super-admin يأخذ كل الصلاحيات
        Role::where('name', 'super-admin')->first()
            ?->syncPermissions(Permission::all());

        // باقي الأدوار
        foreach ($rolePermissions as $roleName => $permNames) {
            if ($roleName === 'super-admin') continue;

            $role = Role::where('name', $roleName)->first();
            if (!$role) continue;

            // نجلب الصلاحيات الموجودة فعلاً (نتجاهل أي اسم غير موجود)
            $existingPerms = Permission::whereIn('name', $permNames)->get();
            $role->syncPermissions($existingPerms);

            $this->command->line("  ↳ {$role->display_name}: {$existingPerms->count()} صلاحية");
        }

        // 5. مسح الكاش مجدداً
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('');
        $this->command->info('🎉 اكتمل الـ Seeder بنجاح!');
        $this->command->table(
            ['الدور', 'عدد الصلاحيات'],
            Role::all()->map(fn($r) => [$r->display_name ?? $r->name, $r->permissions->count()])
        );
    }
}
