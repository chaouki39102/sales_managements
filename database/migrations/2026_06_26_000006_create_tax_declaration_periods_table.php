<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_declaration_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->enum('regime', ['reel', 'forfaitaire']);
            $table->enum('form_type', ['g50', 'g12', 'g12bis']);
            $table->integer('month')->nullable();

            $table->decimal('tva_collectee', 15, 4)->default(0);
            $table->decimal('tva_deductible', 15, 4)->default(0);
            $table->decimal('tva_carry_fwd', 15, 4)->default(0);
            $table->decimal('tva_net', 15, 4)->default(0);
            $table->decimal('timbre_fiscal', 15, 4)->default(0);
            $table->decimal('ifu_subsidized', 15, 4)->default(0);
            $table->decimal('ifu_other', 15, 4)->default(0);
            $table->decimal('ifu_total', 15, 4)->default(0);
            $table->decimal('ifu_minimum', 15, 4)->default(0);
            $table->decimal('amount_due', 15, 4)->default(0);
            $table->decimal('amount_paid', 15, 4)->default(0);

            $table->enum('status', ['draft', 'submitted', 'paid'])->default('draft');
            $table->date('submitted_at')->nullable();
            $table->date('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['company_id', 'fiscal_year_id', 'form_type', 'month'],
                'declaration_period_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_declaration_periods');
    }
};
