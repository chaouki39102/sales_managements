<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for price_levels table
 *
 * Defines different pricing tiers for products (retail, wholesale, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique()
                ->comment('مثال: Détail, Gros, Semi-Gros');
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false)->index()
                ->comment('التعريفة الافتراضية عند إنشاء زبون جديد');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_levels');
    }
};
