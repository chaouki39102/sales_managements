<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for wilayas table
 *
 * Stores Algerian provinces (wilayas) for geographic organization
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wilayas', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('code')->unique()->comment('Official wilaya code');
            $table->string('name', 100);
            $table->string('arabic_name', 100);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wilayas');
    }
};
