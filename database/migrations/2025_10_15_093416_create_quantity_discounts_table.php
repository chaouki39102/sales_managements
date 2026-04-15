<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for quantity_discounts table
 *
 * Manages volume-based discounts for product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quantity_discounts', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('min_quantity', 15, 4)->unsigned();
            $table->decimal('max_quantity', 15, 4)->nullable()->unsigned()->comment('NULL means no upper limit');
            $table->decimal('discount_per_unit', 15, 4)->unsigned()->comment('Discount amount per unit');
            $table->decimal('discount_percentage', 8, 2)->nullable()->unsigned()->comment('Alternative: percentage discount');
            $table->unsignedTinyInteger('tier_order')->default(0)->comment('Order of discount tiers');
            $table->boolean('active')->default(true)->index();
            $table->date('valid_from')->default(now());
            $table->date('valid_to')->nullable();
            $table->timestamps();

            $table->index(['product_variant_id', 'active']);
            $table->index(['min_quantity', 'max_quantity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quantity_discounts');
    }
};
