<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for expense_categories table
 *
 * Categorizes business expenses for better tracking and reporting
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('expense_categories')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
