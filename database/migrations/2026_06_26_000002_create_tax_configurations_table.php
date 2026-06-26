<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->enum('regime', ['reel', 'forfaitaire']);

            $table->json('tva_rates')->nullable();
            $table->json('timbre_fiscal_bareme')->nullable();
            $table->boolean('timbre_fiscal_electronic_exempt')->default(true);
            $table->integer('g50_deadline_day')->default(20);

            $table->decimal('ifu_rate_goods', 5, 4)->default(0.05);
            $table->decimal('ifu_rate_services', 5, 4)->default(0.12);
            $table->decimal('ifu_rate_auto', 5, 4)->default(0.005);
            $table->decimal('ifu_minimum', 15, 2)->default(30000.00);
            $table->decimal('ifu_ca_threshold', 15, 2)->default(8000000.00);

            $table->string('g12_previsionnel_deadline')->default('30/06');
            $table->string('g12_definitif_deadline')->default('20/01');
            $table->integer('g12_tranche1_pct')->default(50);
            $table->integer('g12_tranche2_pct')->default(25);
            $table->integer('g12_tranche3_pct')->default(25);
            $table->string('g12_tranche2_deadline')->default('15/09');
            $table->string('g12_tranche3_deadline')->default('15/12');

            $table->integer('version')->default(1);
            $table->text('change_notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->index(['company_id', 'regime', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_configurations');
    }
};
