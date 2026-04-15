<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_variants table
 *
 * Stores specific variant information (SKU level)
 * Each variant represents a sellable unit with unique pricing and inventory
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();

            // Parent product relationship
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();

            // Variant identification
            $table->string('ref', 50)->nullable()->unique()->comment('SKU/Reference');
            $table->string('barcode', 50)->nullable()->unique();
            $table->string('variant_name', 100)->nullable()->comment('Variant name (e.g., Size L, Color Red)');

            // Unit and tax
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('tva_id')->nullable()->constrained('tvas')->nullOnDelete()->cascadeOnUpdate();

            // Pricing
            $table->decimal('last_purchase_price', 15, 4)->default(0)->unsigned();
            $table->decimal('average_cost_price', 15, 4)->default(0)->unsigned();
            $table->decimal('default_selling_price_ht', 15, 4)->default(0)->unsigned();

            // Stock management settings
            $table->boolean('manages_stock')->default(true);
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('has_lots')->default(false)->comment('Tracks lot/batch numbers');
            $table->boolean('has_expiration_date')->default(false);
            $table->decimal('min_stock_alert', 15, 4)->default(0)->unsigned();
            $table->decimal('max_stock_alert', 15, 4)->default(0)->unsigned();

            // Discounts
            $table->boolean('manages_quantity_discounts')->default(false);

            // Physical attributes
            $table->decimal('weight', 15, 3)->default(0)->unsigned()->comment('Weight in kg');
            $table->decimal('volume', 15, 3)->default(0)->unsigned()->comment('Volume in m³');
            $table->decimal('length', 15, 4)->default(0)->unsigned()->nullable()->comment('Length in cm');
            $table->decimal('width', 15, 4)->default(0)->unsigned()->nullable()->comment('Width in cm');
            $table->decimal('height', 15, 4)->default(0)->unsigned()->nullable()->comment('Height in cm');

            // Variant-specific data
            $table->json('variant_attributes')->nullable()->comment('Color, size, etc.');

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('valuation_method_id')
                ->nullable()
                ->constrained('inventory_valuation_methods');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['ref', 'barcode', 'active']);
            $table->index(['product_id', 'active']);
            $table->index(['manages_stock']); // للمنتجات التي تحتاج إدارة مخزون
        });
        // Disable CHECK constraints for SQLite (not fully supported)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE product_variants
                ADD CONSTRAINT chk_prices CHECK (default_selling_price_ht >= 0)');
            DB::statement('ALTER TABLE product_variants
                ADD CONSTRAINT chk_stock_alerts CHECK (min_stock_alert <= max_stock_alert)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
