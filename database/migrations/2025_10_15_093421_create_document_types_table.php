<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_types table
 *
 * Defines types of commercial documents (invoices, quotes, orders, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('name_latin', 100)->unique();
            $table->string('code', 20)->unique()->comment('Short code for document type');
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('document_base_operation_id')->constrained('document_base_operations')->restrictOnDelete()->cascadeOnUpdate();

            $table->smallInteger('affects_stock_direction')->default(0)->comment('-1 for stock out, 0 for no effect, 1 for stock in');
            $table->boolean('requires_party')->default(true)->comment('Requires customer/supplier');
            $table->boolean('affects_accounting')->default(true);
            $table->boolean('is_printable')->default(true);
            $table->string('print_template', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};
