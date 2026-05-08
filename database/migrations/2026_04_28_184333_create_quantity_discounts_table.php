<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('quantity_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('min_qty', 15, 4)->unsigned()->comment('Qte De — الحد الأدنى للكمية');
            $table->decimal('max_qty', 15, 4)->nullable()->unsigned()->comment('Qte À — الحد الأعلى (NULL = بلا حد أعلى)');
            $table->decimal('discount_amount', 15, 4)->nullable()->unsigned()->comment('Montant Remise — خصم ثابت بالدج لكل وحدة');
            $table->decimal('discount_percentage', 8, 4)->nullable()->unsigned()->comment('Tx Remise % — نسبة خصم من سعر البيع');
            $table->unsignedTinyInteger('tier_order')->default(0);
            $table->boolean('is_blocked')->default(false)->comment('Bloqué — تجميد هذه الشريحة مؤقتاً');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index(['company_id', 'product_id', 'price_level_id', 'active'], 'qty_disc_prod_level_active_idx');
            $table->index(['min_qty', 'max_qty'], 'qty_disc_range_idx');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_qty_range CHECK (max_qty IS NULL OR max_qty > min_qty)");
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_discount_not_empty CHECK (discount_amount IS NOT NULL OR discount_percentage IS NOT NULL)");
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_discount_values CHECK ((discount_amount IS NULL OR discount_amount >= 0) AND (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)))");
        }
    }
    public function down(): void {
        Schema::dropIfExists('quantity_discounts');
    }
};
