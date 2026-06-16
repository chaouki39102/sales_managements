<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ⚠️  هذه Migration اختيارية — لـ Ultra-High Performance فقط
 *
 * المشكلة: حتى مع withCurrentStock scope، الـ JOIN مع stock_movement_types
 * قد يكون بطيئاً جداً مع ملايين الحركات.
 *
 * الحل: denormalized column يُحدَّث من trigger
 * - يُسرّع البحث 1000x
 * - يحتفظ بـ data consistency من الـ DB
 *
 * التكلفة: مساحة إضافية + معالجة trigger
 *
 * ⚠️  لا تستخدمها إلا إذا كان لديك:
 *    - أكثر من 100k منتج
 *    - أكثر من 1M stock movements
 *    - استعلامات slow بـ 2+ ثانية
 */

return new class extends Migration
{
    public function up(): void
    {
        // ─── Step 1: إضافة العمود ─────────────────────────────────────────
        Schema::table('products', function (Blueprint $table) {
            // Decimal(10,3) لأن نفس الخانات مثل opening_quantity
            $table->decimal('current_stock_cached', 10, 3)
                ->nullable()
                ->after('current_cost_price')
                ->comment('مخزن مؤقت: SUM(opening_balance + movements). يُحدَّث من trigger.');
        });

        // ─── Step 2: حساب القيم الابتدائية ──────────────────────────────────
        $this->seedCurrentStock();

        // ─── Step 3: إنشاء trigger لتحديث المخزون عند كل حركة ────────────────
        $this->createTriggers();
    }

    public function down(): void
    {
        // حذف الـ triggers أولاً
        DB::statement('DROP TRIGGER IF EXISTS `after_stock_movement_insert`');
        DB::statement('DROP TRIGGER IF EXISTS `after_stock_movement_update`');
        DB::statement('DROP TRIGGER IF EXISTS `after_stock_movement_delete`');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('current_stock_cached');
        });
    }

    /**
     * حساب المخزون الأولي لكل منتج
     *
     * Formula: SUM(opening_balance.opening_quantity)
     *        + SUM(movement.quantity × movement_type.direction)
     *        WHERE movement.is_validated = true
     */
    private function seedCurrentStock(): void
    {
        DB::statement(<<<'SQL'
            UPDATE products p
            SET p.current_stock_cached = COALESCE((
                -- Opening balance من opening_balances_stock
                SELECT COALESCE(SUM(obs.opening_quantity), 0)
                FROM opening_balances_stock obs
                WHERE obs.product_id = p.id
            ), 0) + COALESCE((
                -- Stock movements (validated فقط)
                SELECT COALESCE(SUM(sm.quantity * COALESCE(smt.direction, 0)), 0)
                FROM stock_movements sm
                LEFT JOIN stock_movement_types smt ON sm.stock_movement_type_id = smt.id
                WHERE sm.product_id = p.id
                  AND sm.is_validated = true
            ), 0)
            WHERE p.manages_stock = true;
        SQL);
    }

    /**
     * إنشاء triggers لتحديث current_stock_cached
     *
     * ✅ يُطلق عند:
     *    - INSERT stock_movement جديدة (validated = true)
     *    - UPDATE stock_movement (تغيير quantity أو is_validated)
     *    - DELETE stock_movement
     */
    private function createTriggers(): void
    {
        // ─── Trigger 1: بعد إدراج حركة ──────────────────────────────────────
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_stock_movement_insert`
            AFTER INSERT ON `stock_movements`
            FOR EACH ROW
            BEGIN
                IF NEW.is_validated = true THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        + (NEW.quantity * COALESCE(
                            (SELECT direction FROM stock_movement_types WHERE id = NEW.stock_movement_type_id),
                            0
                          ))
                    WHERE id = NEW.product_id;
                END IF;
            END
        SQL);

        // ─── Trigger 2: بعد تحديث حركة ────────────────────────────────────
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_stock_movement_update`
            AFTER UPDATE ON `stock_movements`
            FOR EACH ROW
            BEGIN
                -- إذا كانت validated قبل وبعد
                IF OLD.is_validated = true AND NEW.is_validated = true THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        + (NEW.quantity - OLD.quantity) * COALESCE(
                            (SELECT direction FROM stock_movement_types WHERE id = NEW.stock_movement_type_id),
                            0
                          )
                    WHERE id = NEW.product_id;
                -- تحويل من غير مؤكد إلى مؤكد
                ELSEIF OLD.is_validated = false AND NEW.is_validated = true THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        + (NEW.quantity * COALESCE(
                            (SELECT direction FROM stock_movement_types WHERE id = NEW.stock_movement_type_id),
                            0
                          ))
                    WHERE id = NEW.product_id;
                -- تحويل من مؤكد إلى غير مؤكد
                ELSEIF OLD.is_validated = true AND NEW.is_validated = false THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        - (OLD.quantity * COALESCE(
                            (SELECT direction FROM stock_movement_types WHERE id = OLD.stock_movement_type_id),
                            0
                          ))
                    WHERE id = OLD.product_id;
                END IF;
            END
        SQL);

        // ─── Trigger 3: بعد حذف حركة ──────────────────────────────────────
        DB::statement(<<<'SQL'
            CREATE TRIGGER `after_stock_movement_delete`
            AFTER DELETE ON `stock_movements`
            FOR EACH ROW
            BEGIN
                IF OLD.is_validated = true THEN
                    UPDATE products
                    SET current_stock_cached = current_stock_cached
                        - (OLD.quantity * COALESCE(
                            (SELECT direction FROM stock_movement_types WHERE id = OLD.stock_movement_type_id),
                            0
                          ))
                    WHERE id = OLD.product_id;
                END IF;
            END
        SQL);

        // ─── Trigger 4: بعد إضافة رصيد افتتاحي ───────────────────────────────
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

        // ─── Trigger 5: بعد تحديث رصيد افتتاحي ────────────────────────────────
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

        // ─── Trigger 6: بعد حذف رصيد افتتاحي ────────────────────────────────
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
