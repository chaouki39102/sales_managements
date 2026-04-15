<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for payments table
 *
 * Manages payment transactions
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Payment details
            $table->string('payment_number', 50)->unique()->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete()->cascadeOnUpdate()->name('fk_payments_currency_id');
            $table->decimal('amount_local', 15, 4)->nullable()->comment('Amount in base currency if payment is in foreign currency');

            // Payment method
            $table->foreignId('payment_mode_id')->constrained('payment_modes')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();

            // Check reference (if applicable)
            $table->foreignId('check_id')->nullable()->constrained('checks')->nullOnDelete()->cascadeOnUpdate();

            // Party relationship
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();

            // ⭐⭐ (تصحيح) ⭐⭐
            // تمت إضافة السنة المالية لربط الدفعات بالسنوات
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Payment information
            $table->string('reference', 100)->nullable()->comment('Check number, transfer reference, etc.');
            $table->string('bank_reference', 150)->nullable()->comment('Bank transaction reference');
            $table->text('notes')->nullable();

            // Status
            $table->string('status', 50)->default('confirmed')->index()->comment('confirmed, pending, cancelled');
            $table->boolean('is_reconciled')->default(false)->index();
            $table->date('reconciliation_date')->nullable();
            $table->timestampTz('clearing_date')->nullable()->comment('Date the payment cleared the bank');

            // User tracking
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['payment_date', 'status']);
            $table->index(['party_id', 'payment_date']);
            $table->index(['treasury_account_id', 'payment_date']);
            $table->index(['status', 'payment_date', 'treasury_account_id'], 'idx_payment_status_date_account');

            // ⭐⭐ (تصحيح) ⭐⭐
            // فهرس للسنة المالية
            $table->index(['fiscal_year_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

