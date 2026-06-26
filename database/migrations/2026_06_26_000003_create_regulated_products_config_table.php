<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regulated_products_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();

            $table->string('product_key', 80);
            $table->string('label');
            $table->string('unit_label');
            $table->string('category');
            $table->decimal('regulated_max_price', 15, 4);
            $table->decimal('regulated_margin', 15, 4)->nullable();
            $table->enum('regulation_type', ['price', 'margin'])->default('price');
            $table->string('legal_reference')->nullable();
            $table->date('effective_date')->nullable();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'product_key']);
            $table->index(['company_id', 'category', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regulated_products_config');
    }
};
