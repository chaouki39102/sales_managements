<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for audits table
 *
 * Comprehensive audit trail for tracking all changes in the system
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();

            // User information
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_type', 100)->nullable();

            // Event information
            $table->string('event', 50)->index()->comment('created, updated, deleted, etc.');

            // Auditable model (polymorphic)
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');

            // Changed data
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Request information
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 1023)->nullable();

            // Additional context
            $table->json('tags')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};
