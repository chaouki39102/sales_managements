<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 3);
            $table->string('symbol', 10);
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->boolean('is_base_currency')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE currencies COMMENT 'لإدارة العملات المختلفة المستخدمة في النظام'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('currencies');
    }
};
