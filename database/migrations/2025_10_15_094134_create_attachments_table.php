<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for attachments table
 *
 * Polymorphic attachment system for any entity
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            // File information
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 50)->nullable()->comment('MIME type');
            $table->string('file_extension', 10)->nullable();
            $table->unsignedBigInteger('file_size')->nullable()->comment('Size in bytes');

            // Polymorphic relationship
            $table->morphs('attachable');

            // Attachment metadata
            $table->string('title', 200)->nullable();
            $table->text('description')->nullable();
            $table->string('category', 50)->nullable()->index();

            // Security and access
            $table->boolean('is_public')->default(false)->index();
            $table->string('disk', 50)->default('local');
            $table->foreignId('company_id')
                ->nullable()
                ->after('id')
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index('company_id');

            // Audit
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['attachable_type', 'attachable_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
