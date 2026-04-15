<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for commercial_document_lines table (renamed from document_lines)
 *
 * Stores line items for commercial documents
 * Now linked to product_variant_id instead of product_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commercial_document_lines', function (Blueprint $table) {
            $table->id();

            // Parent document
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();

            // Product variant reference
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete()->cascadeOnUpdate();

            // Line details
            $table->unsignedSmallInteger('line_order')->default(0)->comment('Display order');
            $table->text('description')->nullable()->comment('Line description');

            // Quantities
            $table->decimal('quantity', 15, 3);
            $table->decimal('delivered_quantity', 15, 3)->default(0)->comment('Quantity delivered');
            $table->decimal('returned_quantity', 15, 3)->default(0)->comment('Quantity returned');

            // Pricing
            $table->decimal('unit_price_ht', 15, 4)->comment('Unit price excluding tax');
            $table->decimal('discount_percentage', 8, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.00);
            $table->decimal('tva_rate', 8, 2);
            $table->decimal('total_ht', 15, 4)->comment('Line total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00);
            $table->decimal('total_ttc', 15, 4)->comment('Line total including tax');

            // Lot tracking
            $table->unsignedBigInteger('stock_lot_id') // <--- تم التغيير من foreignId
                ->nullable();

            $table->boolean('is_auto_split')->default(false)
                ->index();

            $table->unsignedBigInteger('parent_line_id')->nullable();

            $table->foreign('parent_line_id')
                ->references('id')
                ->on('commercial_document_lines')
                ->restrictOnDelete(); // 🔒 منع حذف السطر الأب

            // Additional data
            $table->json('line_attributes')->nullable()->comment('Additional line attributes');

            $table->timestamps();

            // Indexes
            $table->index(['commercial_document_id', 'line_order'], 'doc_lines_doc_order_idx');
            $table->index('product_variant_id');
            $table->index('stock_lot_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commercial_document_lines');
    }
};
