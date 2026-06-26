<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subsidized_sales_summary', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->integer('month')->nullable();

            $table->foreignId('regulated_product_config_id')
                  ->constrained('regulated_products_config')
                  ->cascadeOnDelete();

            $table->decimal('qty_sold', 15, 4)->default(0);
            $table->decimal('purchase_price_avg', 15, 4)->default(0);
            $table->decimal('actual_sell_price', 15, 4)->default(0);
            $table->decimal('regulated_max_price', 15, 4)->default(0);
            $table->decimal('margin_per_unit', 15, 4)->default(0);
            $table->decimal('total_margin', 15, 4)->default(0);
            $table->decimal('ifu_base', 15, 4)->default(0);
            $table->decimal('ifu_amount', 15, 4)->default(0);
            $table->boolean('price_violation')->default(false);

            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['company_id', 'fiscal_year_id', 'month', 'regulated_product_config_id'],
                'subsidized_summary_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsidized_sales_summary');
    }
};
