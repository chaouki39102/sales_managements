<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('company_wilaya', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('wilaya_id')->constrained('wilayas')->cascadeOnDelete();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'wilaya_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('company_wilaya');
    }
};
