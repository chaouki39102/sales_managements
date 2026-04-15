<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for units table (renamed from unites)
 *
 * Manages units of measurement for products
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('symbol', 20)->nullable()->comment('Unit symbol (e.g., kg, m, l)');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
