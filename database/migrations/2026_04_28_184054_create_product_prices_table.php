<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('pricing_method', ['fixed', 'rate', 'margin'])->default('fixed')->comment('fixed=سعر مباشر | rate=نسبة% فوق الشراء | margin=هامش ثابت دج');
            $table->decimal('price', 15, 4)->nullable()->comment('Prix de Vente HT — للطريقة fixed فقط');
            $table->decimal('rate', 8, 4)->nullable()->comment('Taux % — للطريقة rate فقط');
            $table->decimal('margin', 15, 4)->nullable()->comment('Marge دج — للطريقة margin فقط');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'price_level_id'], 'product_price_level_unique');
            $table->index(['company_id', 'product_id', 'active']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE product_prices ADD CONSTRAINT chk_pricing_method CHECK ((pricing_method = 'fixed' AND price IS NOT NULL AND price >= 0) OR (pricing_method = 'rate' AND rate IS NOT NULL AND rate >= 0) OR (pricing_method = 'margin' AND margin IS NOT NULL))");
        }
    }
    public function down(): void {
        Schema::dropIfExists('product_prices');
    }
};
