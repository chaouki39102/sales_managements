<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * نقطة البداية لتشغيل جميع الـ Seeders بالترتيب الصحيح
     *
     * القاعدة: البيانات الثابتة التي في المهاجر (party_types, product_types,
     * stock_movement_types, treasury_account_types) لا تُعاد هنا.
     * الـ Seeders هنا فقط للبيانات التي ليست في المهاجر.
     */
    public function run(): void
    {
        // ═══════════════════════════════════════════════════════════
        // المرحلة 1: جداول Lookup المستقلة (لا تعتمد على شركة أو مستخدم)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            GenderSeeder::class,                      // genders
            CurrencySeeder::class,                    // currencies
            TvaSeeder::class,                         // tvas
            UnitSeeder::class,                        // units
            LegalFormSeeder::class,                   // legal_forms
            FiscalStampSeeder::class,                 // fiscal_stamps
            InventoryValuationMethodSeeder::class,    // inventory_valuation_methods
            DocumentBaseOperationSeeder::class,       // document_base_operations
            DocumentStatusSeeder::class,              // document_statuses
            PriceLevelSeeder::class,                  // price_levels
            ExpenseCategorySeeder::class,             // expense_categories
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 2: البيانات الجغرافية (ولاية + بلدية)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WilayaCommuneSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 3: الصلاحيات والأدوار (تعريفها قبل المستخدمين)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 4: الشركة (بدون owner_id في البداية)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            CompanySeeder::class,   // يقوم بإنشاء شركة واحدة وتخزين معرفها في cache
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 5: المستخدمين (لا يحتاجون company_id)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            UserSeeder::class,      // ينشئ المستخدمين (super-admin, admin)
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 7: السنة المالية (تحتاج company_id)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            FiscalYearSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 8: المستودعات (تحتاج company_id + wilaya)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WarehouseSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 9: حسابات الخزينة وطرق الدفع (تحتاج company_id + عملة)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 10: أنواع المستندات وسلاسل الترقيم
        // ═══════════════════════════════════════════════════════════
        $this->call([
            DocumentTypeSeeder::class,
            NumberingSeriesSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // ملاحظة: أي سيدرات أخرى (ExpenseSeeder، ProductSeeder، ...)
        // يمكن إضافتها في مراحل لاحقة بعد اكتمال البنية الأساسية.
        // ═══════════════════════════════════════════════════════════
    }
}
