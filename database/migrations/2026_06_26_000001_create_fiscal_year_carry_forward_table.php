<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_year_carry_forward', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->foreignId('source_fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->enum('category', [
                'tva_deductible',
                'tva_collectee',
                'advance_client',
                'advance_supplier',
                'forex_diff',
                'timbre_fiscal',
            ]);
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('amount_dzd', 15, 4)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'fiscal_year_id', 'category', 'currency_id'], 'carry_forward_unique');
            $table->index(['company_id', 'fiscal_year_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_year_carry_forward');
    }
};
