<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('print_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('doc_type_code', 10);
            $table->string('paper_size', 10)->default('80mm');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->longText('config')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'doc_type_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('print_templates');
    }
};
