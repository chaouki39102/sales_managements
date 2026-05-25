<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('expense_number', 50)->nullable();
            $table->date('date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_mode_id')->nullable()->constrained('payment_modes')->nullOnDelete();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('reference', 100)->nullable()->comment('Invoice number, receipt number, etc.');
            $table->boolean('has_attachments')->default(false);
            $table->string('status', 50)->default('confirmed')->index();
            $table->boolean('is_paid')->default(true)->index();
            $table->boolean('is_recurring')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'expense_number']);

            $table->index(['company_id', 'date', 'status']);
            $table->index(['company_id', 'expense_category_id', 'date']);
            $table->index(['company_id', 'party_id', 'date']);
            $table->index(['company_id', 'fiscal_year_id', 'date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('expenses');
    }
};
