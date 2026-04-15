<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration for products table (renamed from articles)
 *
 * Stores general product information (parent level)
 * This table contains shared information for all product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // Basic information
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->text('description')->nullable();

            // Categorization
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete()->cascadeOnUpdate();
            // ✅ CORRECTED: Kept restrictOnDelete (non-nullable), added cascadeOnUpdate
            $table->foreignId('product_type_id')->constrained('product_types')->restrictOnDelete()->cascadeOnUpdate();

            // Product specifications
            $table->json('specifications')->nullable()->comment('Product specifications and attributes');

            // Images and media
            $table->json('images')->nullable()->comment('Product images');

            // SEO and metadata
            $table->string('meta_title', 200)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('meta_keywords')->nullable();

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['name', 'active']);
            $table->index(['family_id', 'brand_id', 'active']);
            // Disable fullText for SQLite (not supported)
            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'description']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
