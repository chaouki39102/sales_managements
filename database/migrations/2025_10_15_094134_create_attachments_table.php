<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 50)->nullable()->comment('MIME type');
            $table->string('file_extension', 10)->nullable();
            $table->unsignedBigInteger('file_size')->nullable()->comment('Size in bytes');
            $table->morphs('attachable');
            $table->string('title', 200)->nullable();
            $table->text('description')->nullable();
            $table->string('category', 50)->nullable()->index();
            $table->boolean('is_public')->default(false)->index();
            $table->string('disk', 50)->default('local');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['attachable_type', 'attachable_id', 'category']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('attachments');
    }
};
