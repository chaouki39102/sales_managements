<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_base_operations lookup table
 *
 * Defines base operations for commercial documents
 * Replaces the ENUM base_operation field in document_types table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_base_operations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });


    }

    public function down(): void
    {
        Schema::dropIfExists('document_base_operations');
    }
};
