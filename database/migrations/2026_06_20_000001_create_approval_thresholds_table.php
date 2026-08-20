<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('approval_thresholds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('min_amount', 15, 4);
            $table->decimal('max_amount', 15, 4)->nullable();
            $table->boolean('requires_approval')->default(true);
            $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete()->cascadeOnUpdate();
            $table->string('notes', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['company_id', 'document_type_id', 'is_active'], 'at_compid_doctype_active_idx');
        });
    }
    public function down(): void {
        Schema::dropIfExists('approval_thresholds');
    }
};
