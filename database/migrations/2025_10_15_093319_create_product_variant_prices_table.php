<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_variant_prices table (renamed from article_prices)
 *
 * Manages different pricing levels for product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variant_prices', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('price', 15, 4)->unsigned();
            $table->date('valid_from')->default(now())->comment('Price validity start date');
            $table->date('valid_to')->nullable()->comment('Price validity end date');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->unique(['product_variant_id', 'price_level_id', 'valid_from'], 'variant_price_level_date_unique');
            $table->index(['product_variant_id', 'active']);
            $table->index(['valid_from', 'valid_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_prices');
    }
};
