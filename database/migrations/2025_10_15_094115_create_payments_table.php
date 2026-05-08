<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('payment_number', 50)->unique()->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete()->cascadeOnUpdate()->name('fk_payments_currency_id');
            $table->decimal('amount_local', 15, 4)->nullable()->comment('Amount in base currency');
            $table->foreignId('payment_mode_id')->constrained('payment_modes')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('check_id')->nullable()->constrained('checks')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('reference', 100)->nullable()->comment('Check number, transfer reference, etc.');
            $table->string('bank_reference', 150)->nullable()->comment('Bank transaction reference');
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('confirmed')->index()->comment('confirmed, pending, cancelled');
            $table->boolean('is_reconciled')->default(false)->index();
            $table->date('reconciliation_date')->nullable();
            $table->timestampTz('clearing_date')->nullable()->comment('Date the payment cleared the bank');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'payment_date', 'status']);
            $table->index(['company_id', 'party_id', 'payment_date']);
            $table->index(['company_id', 'treasury_account_id', 'payment_date']);
            $table->index(['company_id', 'status', 'payment_date', 'treasury_account_id'], 'idx_payment_status_date_account');
            $table->index(['company_id', 'fiscal_year_id', 'payment_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payments');
    }
};
