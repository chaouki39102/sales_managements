<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for treasury_accounts table
 *
 * Manages bank and cash accounts
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->id();

            // Account information
            $table->string('name', 100);
            $table->string('code', 20)->unique()->nullable();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('treasury_account_type_id')->constrained('treasury_account_types')->restrictOnDelete()->cascadeOnUpdate();

            // Bank details (for bank accounts)
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('rib', 30)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('swift_bic', 11)->nullable();

            // Financial information
            $table->string('currency', 3)->default('DZD');
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);

            // Settings
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('active')->default(true)->index();

            // Additional information
            $table->text('notes')->nullable();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['treasury_account_type_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_accounts');
    }
};
