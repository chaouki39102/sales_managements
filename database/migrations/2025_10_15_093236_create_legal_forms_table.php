<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('legal_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('code', 20);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('requires_capital')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE legal_forms COMMENT 'الأشكال القانونية للشركات حسب القانون الجزائري'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('legal_forms');
    }
};
