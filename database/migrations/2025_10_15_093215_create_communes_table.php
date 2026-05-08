<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->string('post_code', 10)->nullable()->index();
            $table->string('name', 100);
            $table->string('arabic_name', 100);
            $table->foreignId('wilaya_id')->constrained('wilayas')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('communes');
    }
};
