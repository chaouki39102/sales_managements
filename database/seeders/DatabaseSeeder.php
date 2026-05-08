<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ═══════════════════════════════════════════════════════════
        // المرحلة 1: البيانات الجغرافية (مستقلة تماماً)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WilayaCommuneSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 2: المستخدم الأول (قبل الشركة لأن companies.owner_id → users)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            UserSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 3: الشركة (تحتاج user_id لربط owner_id)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            CompanySeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 4: جداول Lookup المرتبطة بالشركة
        // ═══════════════════════════════════════════════════════════
        $this->call([
            GenderSeeder::class,
            CurrencySeeder::class,
            TvaSeeder::class,
            UnitSeeder::class,
            LegalFormSeeder::class,
            FiscalStampSeeder::class,
            InventoryValuationMethodSeeder::class,
            DocumentBaseOperationSeeder::class,
            DocumentStatusSeeder::class,
            PriceLevelSeeder::class,
            ExpenseCategorySeeder::class,
            PartyTypeSeeder::class,
            ProductTypeSeeder::class,
            StockMovementTypeSeeder::class,
            TreasuryAccountTypeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 5: الصلاحيات والأدوار (بعد الشركة)
        // ═══════════════════════════════════════════════════════════
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 6: السنة المالية
        // ═══════════════════════════════════════════════════════════
        $this->call([
            FiscalYearSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 7: المستودعات
        // ═══════════════════════════════════════════════════════════
        $this->call([
            WarehouseSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 8: الخزينة وطرق الدفع
        // ═══════════════════════════════════════════════════════════
        $this->call([
            TreasuryAccountSeeder::class,
            PaymentModeSeeder::class,
        ]);

        // ═══════════════════════════════════════════════════════════
        // المرحلة 9: أنواع المستندات وسلاسل الترقيم
        // ═══════════════════════════════════════════════════════════
        $this->call([
            DocumentTypeSeeder::class,
            NumberingSeriesSeeder::class,
        ]);
    }
}
