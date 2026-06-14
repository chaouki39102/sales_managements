<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * إصلاح Migration_CurrentStockCached — مشكلتان حرجتان:
 *
 * المشكلة 1: seedCurrentStock() تجمع opening_quantity من كل السنوات المالية
 *   SELECT SUM(obs.opening_quantity) FROM opening_balances_stock
 *   بدون فلتر fiscal_year_id → تُضاعف المخزون لكل سنة إضافية.
 *   الصحيح: أخذ opening_quantity من السنة المالية الحالية فقط (is_current=true).
 *
 * المشكلة 2: triggers 4,5,6 (opening_balance insert/update/delete)
 *   تُحدّث current_stock_cached بكل تغيير في opening_balances_stock
 *   بما فيها سنوات مالية مغلقة (ترحيل FiscalYearClosure) → يُضاعف المخزون
 *   عند كل إقفال سنة مالية لأن transferStockBalances() تُدرج صفوفاً جديدة.
 *   الصحيح: triggers تتحقق من fiscal_year_id = السنة المالية الحالية للشركة.
 *
 * هذه الميغريشن تحذف الـ triggers القديمة وتُعيد بناءها بشكل صحيح.
 * تُشغَّل فقط إذا كانت Migration_CurrentStockCached مُفعَّلة.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'current_stock_cached')) {
            // Migration_CurrentStockCached لم تُشغَّل — لا شيء للإصلاح
            return;
        }

        // 1. حذف الـ triggers القديمة
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_insert`');
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_update`');
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_delete`');

        // 2. إعادة حساب current_stock_cached بشكل صحيح (السنة الحالية فقط)
        DB::statement(<<<'SQL'
            UPDATE products p
            SET p.current_stock_cached = COALESCE((
                SELECT SUM(obs.opening_quantity)
                FROM opening_balances_stock obs
                INNER JOIN fiscal_years fy ON obs.fiscal_year_id = fy.id
                WHERE obs.product_id = p.id
                  AND obs.company_id = p.company_id
                  AND fy.is_current   = 1
                  AND fy.company_id   = p.company_id
            ), 0) + COALESCE((
                SELECT SUM(sm.quantity * COALESCE(smt.direction, 0))
                FROM stock_movements sm
                LEFT JOIN stock_movement_types smt ON sm.stock_movement_type_id = smt.id
                INNER JOIN fiscal_years fy ON sm.fiscal_year_id = fy.id
                WHERE sm.product_id   = p.id
                  AND sm.company_id   = p.company_id
                  AND sm.is_validated = 1
                  AND fy.is_current   = 1
                  AND fy.company_id   = p.company_id
                  AND sm.deleted_at   IS NULL
            ), 0)
            WHERE p.manages_stock = 1;
        SQL);

        // 3. إعادة بناء الـ triggers بشكل صحيح
        // Trigger 4: بعد إدراج رصيد افتتاحي — فقط إذا كانت السنة هي الحالية
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_insert`
            AFTER INSERT ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                IF (SELECT is_current FROM fiscal_years WHERE id = NEW.fiscal_year_id) = 1 THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached + NEW.opening_quantity
                    WHERE id = NEW.product_id;
                END IF;
            END
        SQL);

        // Trigger 5: بعد تحديث رصيد افتتاحي — فقط إذا كانت السنة هي الحالية
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_update`
            AFTER UPDATE ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                IF (SELECT is_current FROM fiscal_years WHERE id = NEW.fiscal_year_id) = 1 THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        + (NEW.opening_quantity - OLD.opening_quantity)
                    WHERE id = NEW.product_id;
                END IF;
            END
        SQL);

        // Trigger 6: بعد حذف رصيد افتتاحي — فقط إذا كانت السنة هي الحالية
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_delete`
            AFTER DELETE ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                IF (SELECT is_current FROM fiscal_years WHERE id = OLD.fiscal_year_id) = 1 THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached - OLD.opening_quantity
                    WHERE id = OLD.product_id;
                END IF;
            END
        SQL);
    }

    public function down(): void
    {
        if (!Schema::hasColumn('products', 'current_stock_cached')) {
            return;
        }

        // إعادة الـ triggers القديمة (بدون فلتر السنة)
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_insert`');
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_update`');
        DB::statement('DROP TRIGGER IF EXISTS `after_opening_balance_delete`');

        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_insert`
            AFTER INSERT ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                UPDATE products
                SET current_stock_cached = current_stock_cached + NEW.opening_quantity
                WHERE id = NEW.product_id;
            END
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_update`
            AFTER UPDATE ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                UPDATE products
                SET current_stock_cached = current_stock_cached
                    + (NEW.opening_quantity - OLD.opening_quantity)
                WHERE id = NEW.product_id;
            END
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_opening_balance_delete`
            AFTER DELETE ON `opening_balances_stock`
            FOR EACH ROW
            BEGIN
                UPDATE products
                SET current_stock_cached = current_stock_cached - OLD.opening_quantity
                WHERE id = OLD.product_id;
            END
        SQL);
    }
};
