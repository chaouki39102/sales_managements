<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Gate;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear cached permissions before starting
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // === Create Permissions ===
        // User permissions group
        Permission::firstOrCreate([
            'name' => 'view-users',
            'display_name' => 'عرض المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'عرض قائمة بجميع المستخدمين في النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-users',
            'display_name' => 'إنشاء مستخدمين',
            'group' => 'المستخدمين',
            'description' => 'إنشاء مستخدمين جدد في النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-users',
            'display_name' => 'تعديل المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'تعديل بيانات المستخدمين الحاليين',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-users',
            'display_name' => 'حذف المستخدمين',
            'group' => 'المستخدمين',
            'description' => 'حذف المستخدمين من النظام',
        ]);

        // Articles (Products) permissions group
        Permission::firstOrCreate([
            'name' => 'view-articles',
            'display_name' => 'عرض المنتجات',
            'group' => 'المنتجات',
            'description' => 'عرض قائمة بجميع المنتجات',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-articles',
            'display_name' => 'إنشاء منتجات',
            'group' => 'المنتجات',
            'description' => 'إنشاء منتج جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-articles',
            'display_name' => 'تعديل المنتجات',
            'group' => 'المنتجات',
            'description' => 'تعديل بيانات منتج موجود',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-articles',
            'display_name' => 'حذف المنتجات',
            'group' => 'المنتجات',
            'description' => 'حذف منتج من النظام',
        ]);

        // Documents (Invoices) permissions group
        Permission::firstOrCreate([
            'name' => 'view-documents',
            'display_name' => 'عرض المستندات',
            'group' => 'المستندات',
            'description' => 'عرض جميع المستندات (فواتير، مستندات شراء، إلخ)',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-sales-documents',
            'display_name' => 'إنشاء مستندات بيع',
            'group' => 'المستندات',
            'description' => 'إنشاء مستندات بيع جديدة',
        ]);
        Permission::firstOrCreate([
            'name' => 'create-purchase-documents',
            'display_name' => 'إنشاء مستندات شراء',
            'group' => 'المستندات',
            'description' => 'إنشاء مستندات شراء جديدة',
        ]);
        Permission::firstOrCreate([
            'name' => 'edit-documents',
            'display_name' => 'تعديل المستندات',
            'group' => 'المستندات',
            'description' => 'تعديل المستندات الموجودة',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete-documents',
            'display_name' => 'حذف المستندات',
            'group' => 'المستندات',
            'description' => 'حذف المستندات من النظام',
        ]);
        Permission::firstOrCreate([
            'name' => 'validate-documents',
            'display_name' => 'تأكيد المستندات',
            'group' => 'المستندات',
            'description' => 'تأكيد المستندات لضمان صحتها',
        ]);

        // Roles & Permissions permissions
        Permission::firstOrCreate([
            'name' => 'manage-roles',
            'display_name' => 'إدارة الأدوار والصلاحيات',
            'group' => 'الإعدادات',
            'description' => 'التحكم في الأدوار والصلاحيات للمستخدمين',
        ]);

        // General Settings permissions
        Permission::firstOrCreate([
            'name' => 'manage-settings',
            'display_name' => 'إدارة الإعدادات',
            'group' => 'الإعدادات',
            'description' => 'إدارة الإعدادات العامة للنظام',
        ]);

        // Party permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_party',
            'display_name' => 'عرض جميع الأطراف',
            'group' => 'الأطراف',
            'description' => 'عرض قائمة بجميع الأطراف',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_party',
            'display_name' => 'عرض متعامل',
            'group' => 'الأطراف',
            'description' => 'عرض متعامل واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_party',
            'display_name' => 'إنشاء متعامل',
            'group' => 'الأطراف',
            'description' => 'إنشاء متعامل جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_party',
            'display_name' => 'تحديث متعامل',
            'group' => 'الأطراف',
            'description' => 'تحديث بيانات متعامل',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_party',
            'display_name' => 'حذف متعامل',
            'group' => 'الأطراف',
            'description' => 'حذف متعامل',
        ]);
        Permission::firstOrCreate([
            'name' => 'restore_party',
            'display_name' => 'استعادة متعامل',
            'group' => 'الأطراف',
            'description' => 'استعادة متعامل محذوف',
        ]);
        Permission::firstOrCreate([
            'name' => 'force_delete_party',
            'display_name' => 'حذف نهائي',
            'group' => 'الأطراف',
            'description' => 'حذف نهائي لمتعامل',
        ]);

        // Product permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_product',
            'display_name' => 'عرض جميع المنتجات',
            'group' => 'المنتجات',
            'description' => 'عرض قائمة بجميع المنتجات',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_product',
            'display_name' => 'عرض منتج',
            'group' => 'المنتجات',
            'description' => 'عرض منتج واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_product',
            'display_name' => 'إنشاء منتج',
            'group' => 'المنتجات',
            'description' => 'إنشاء منتج جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_product',
            'display_name' => 'تحديث منتج',
            'group' => 'المنتجات',
            'description' => 'تحديث بيانات منتج',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_product',
            'display_name' => 'حذف منتج',
            'group' => 'المنتجات',
            'description' => 'حذف منتج',
        ]);

        // Commercial Document permissions (for Policies)
        Permission::firstOrCreate([
            'name' => 'view_any_commercial_document',
            'display_name' => 'عرض جميع المستندات التجارية',
            'group' => 'المستندات',
            'description' => 'عرض قائمة بجميع المستندات التجارية',
        ]);
        Permission::firstOrCreate([
            'name' => 'view_commercial_document',
            'display_name' => 'عرض مستند تجاري',
            'group' => 'المستندات',
            'description' => 'عرض مستند تجاري واحد',
        ]);
        Permission::firstOrCreate([
            'name' => 'create_commercial_document',
            'display_name' => 'إنشاء مستند تجاري',
            'group' => 'المستندات',
            'description' => 'إنشاء مستند تجاري جديد',
        ]);
        Permission::firstOrCreate([
            'name' => 'update_commercial_document',
            'display_name' => 'تحديث مستند تجاري',
            'group' => 'المستندات',
            'description' => 'تحديث بيانات مستند تجاري',
        ]);
        Permission::firstOrCreate([
            'name' => 'delete_commercial_document',
            'display_name' => 'حذف مستند تجاري',
            'group' => 'المستندات',
            'description' => 'حذف مستند تجاري',
        ]);


        // === Create Roles ===

        // Super Admin Role
        $superAdminRole = Role::firstOrCreate([
            'name' => 'super-admin',
            'display_name' => 'مدير خارق',
            'description' => 'يمتلك جميع الصلاحيات في النظام',
        ]);
        // تعيين كل الصلاحيات لدور المدير الخارق
        $superAdminRole->givePermissionTo(Permission::all());

        // Moderator Role
        $moderatorRole = Role::firstOrCreate([
            'name' => 'moderator',
            'display_name' => 'مشرف',
            'description' => 'يمكنه إدارة معظم أجزاء النظام',
        ]);
        $moderatorRole->givePermissionTo([
            'view-users', 'create-users', 'edit-users',
            'view-articles', 'create-articles', 'edit-articles',
            'view-documents', 'create-sales-documents', 'create-purchase-documents', 'edit-documents', 'validate-documents'
        ]);

        // Salesperson Role
        $salespersonRole = Role::firstOrCreate([
            'name' => 'salesperson',
            'display_name' => 'بائع',
            'description' => 'يمكنه إدارة عمليات البيع فقط',
        ]);
        $salespersonRole->givePermissionTo([
            'view-articles',
            'view-documents',
            'create-sales-documents',
        ]);
    }
}
