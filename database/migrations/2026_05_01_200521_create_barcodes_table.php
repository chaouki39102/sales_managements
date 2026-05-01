<?php
// database/migrations/YYYY_MM_DD_HHMMSS_create_barcodes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('barcode')->unique();
            $table->string('type', 50)->nullable()->comment('primary, unit, box, supplier, etc.');
            $table->boolean('is_primary')->default(false);
            $table->string('unit', 50)->nullable()->comment('piece, kg, box, pack');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barcodes');
    }
};
