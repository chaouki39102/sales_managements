<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for checks table
 *
 * Manages check payments and their lifecycle
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checks', function (Blueprint $table) {
            $table->id();

            // Check information
            $table->string('check_number', 50)->unique();
            $table->date('check_date')->comment('Issue date');
            $table->date('due_date')->nullable()->comment('Due date for post-dated checks');
            $table->decimal('amount', 15, 4);

            // Bank details
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('drawer_name', 150)->nullable()->comment('Check drawer name');

            // Party relationship
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();

            // Status tracking
            $table->string('status', 50)->default('pending')->index()->comment('pending, cleared, bounced, cancelled');
            $table->date('cleared_date')->nullable();
            $table->text('bounce_reason')->nullable();

            // Additional information
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();

            // Indexes
            $table->index(['status', 'due_date']);
            $table->index(['party_id', 'status']);
            $table->index('check_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checks');
    }
};
