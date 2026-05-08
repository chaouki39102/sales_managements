<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('barcode')->nullable()->unique();
            $table->string('type', 50)->nullable()->comment('primary, unit, box, supplier, etc.');
            $table->boolean('is_primary')->default(false);
            $table->string('unit', 50)->nullable()->comment('piece, kg, box, pack');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'product_id']);
            $table->index(['company_id', 'variant_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('barcodes');
    }
};
