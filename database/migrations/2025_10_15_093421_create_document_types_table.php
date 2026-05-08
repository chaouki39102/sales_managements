<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('name_latin', 100);
            $table->string('code', 20);
            $table->text('description')->nullable();
            $table->foreignId('document_base_operation_id')->constrained('document_base_operations')->restrictOnDelete()->cascadeOnUpdate();
            $table->smallInteger('affects_stock_direction')->default(0)->comment('-1 for stock out, 0 for no effect, 1 for stock in');
            $table->boolean('requires_party')->default(true)->comment('Requires customer/supplier');
            $table->boolean('affects_accounting')->default(true);
            $table->boolean('is_printable')->default(true);
            $table->string('print_template', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'name_latin']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_types');
    }
};
