<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for stock_movements table
 *
 * Tracks all inventory movements
 * Now linked to product_variant_id instead of article_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            // Product and location
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();

            // ⭐ تعديل: إضافة السنة المالية ⭐
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Movement type
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('stock_movement_type_id')->constrained('stock_movement_types')->restrictOnDelete()->cascadeOnUpdate();

            // Related document
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
$table->unsignedBigInteger('commercial_document_line_id') // <--- تم التغيير من foreignId
    ->nullable();
            // Movement details
            $table->dateTime('movement_date');
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('cost_price', 15, 4)->comment('Cost price at movement time');
            $table->decimal('total_price', 15, 4);

            // Stock balance after movement
            $table->decimal('stock_balance_after', 15, 3)->comment('Stock quantity after this movement');

            // Lot tracking
            $table->string('lot_number', 100)->nullable();
            $table->date('expiration_date')->nullable();

            // Additional information
            $table->string('reason', 255)->nullable()->comment('Reason for movement');
            $table->text('notes')->nullable();

            // User and relationships
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('parent_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete()->cascadeOnUpdate()->comment('For adjustments or reversals');

            $table->boolean('is_validated')->default(false)->index()
                ->comment('محققة ومعتمدة؟');
            $table->foreignId('validated_by')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();

// Lot tracking
$table->unsignedBigInteger('stock_lot_id') // <--- تم التغيير من foreignId
    ->nullable()
    ->index();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['product_variant_id', 'warehouse_id', 'movement_date'], 'stock_mov_prod_wh_date_idx');
            $table->index(['movement_date', 'stock_movement_type_id']);
            $table->index(['warehouse_id', 'movement_date']);
            $table->index('lot_number');
            // ⭐ تعديل: إضافة فهرس للسنة المالية ⭐
            $table->index(['fiscal_year_id', 'movement_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
