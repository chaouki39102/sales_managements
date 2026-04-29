<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * جدول تخفيضات الكميات — Tx Remise
 *
 * الخصم يُطبَّق على سعر البيع المحسوب في PHP وليس على price_computed (محذوف).
 *
 * كل تعريفة (price_level) لها شرائح تخفيض مستقلة لكل منتج.
 *
 * مثال:
 *   منتج A | Détail | من 20  إلى 95  → خصم 2%
 *   منتج A | Détail | من 96  إلى 479 → خصم 5%
 *   منتج A | Détail | من 480 → ∞     → خصم 8%
 *   منتج A | Gros   | من 100 → ∞     → خصم 3%
 *
 * الحساب النهائي في PHP:
 *   سعر_البيع  = ProductPrice::computePrice(product, price_level)
 *   الخصم      = QuantityDiscount::findDiscount(product, price_level, quantity)
 *   السعر_النهائي = سعر_البيع × (1 - discount_percentage/100)
 *              أو = سعر_البيع - discount_amount
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quantity_discounts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // الخصم مرتبط بتعريفة محددة
            $table->foreignId('price_level_id')
                ->constrained('price_levels')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // نطاق الكميات (بالوحدة الأساسية دائماً)
            $table->decimal('min_qty', 15, 4)->unsigned()
                ->comment('Qte De — الحد الأدنى للكمية');
            $table->decimal('max_qty', 15, 4)->nullable()->unsigned()
                ->comment('Qte À — الحد الأعلى (NULL = بلا حد أعلى)');

            // نوع الخصم — واحد منهما على الأقل يجب أن يكون مملوءاً
            $table->decimal('discount_amount', 15, 4)->nullable()->unsigned()
                ->comment('Montant Remise — خصم ثابت بالدج لكل وحدة');
            $table->decimal('discount_percentage', 8, 4)->nullable()->unsigned()
                ->comment('Tx Remise % — نسبة خصم من سعر البيع');

            // ترتيب الشريحة (للعرض والترتيب في الواجهة)
            $table->unsignedTinyInteger('tier_order')->default(0);

            // تجميد الشريحة مؤقتاً دون حذفها
            $table->boolean('is_blocked')->default(false)
                ->comment('Bloqué — تجميد هذه الشريحة مؤقتاً');

            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            // فهارس
            $table->index(
                ['product_id', 'price_level_id', 'active'],
                'qty_disc_prod_level_active_idx'
            );
            $table->index(['min_qty', 'max_qty'], 'qty_disc_range_idx');
        });

        // قيود CHECK
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE quantity_discounts
                ADD CONSTRAINT chk_qty_range
                CHECK (max_qty IS NULL OR max_qty > min_qty)
            ");
            DB::statement("
                ALTER TABLE quantity_discounts
                ADD CONSTRAINT chk_discount_not_empty
                CHECK (
                    discount_amount IS NOT NULL OR discount_percentage IS NOT NULL
                )
            ");
            DB::statement("
                ALTER TABLE quantity_discounts
                ADD CONSTRAINT chk_discount_values
                CHECK (
                    (discount_amount     IS NULL OR discount_amount     >= 0) AND
                    (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100))
                )
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quantity_discounts');
    }
};
