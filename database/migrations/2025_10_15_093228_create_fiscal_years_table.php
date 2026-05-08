<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false)->index();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('is_current')->default(false)->index();
            $table->text('closing_notes')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
            $table->index(['company_id', 'is_current']);
            $table->index(['company_id', 'start_date', 'end_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('fiscal_years');
    }
};
