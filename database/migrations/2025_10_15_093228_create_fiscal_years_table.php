<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for fiscal_years table
 * 
 * Manages fiscal/financial years for accounting periods
 * Required for Algerian accounting system compliance
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique()->comment('e.g., 2025, FY2025');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false)->index();
            $table->date('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_current')->default(false)->index()->comment('Currently active fiscal year');
            $table->text('closing_notes')->nullable();
            $table->timestamps();
            
            // Ensure no overlapping periods
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};
