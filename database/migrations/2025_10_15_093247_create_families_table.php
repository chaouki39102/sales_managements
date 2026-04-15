<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for families table
 *
 * Manages hierarchical product categories/families
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug')->unique()->nullable();
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('parent_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();

            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('families');
    }
};
