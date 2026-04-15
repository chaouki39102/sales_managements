<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for expenses table
 *
 * Tracks business expenses and operational costs
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            // Expense details
            $table->string('expense_number', 50)->unique()->nullable();
            $table->date('date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();

            // ⭐ السنة المالية ⭐
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Payment information
            $table->foreignId('payment_mode_id')->nullable()->constrained('payment_modes')->nullOnDelete();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete();

            // Supplier/Party (optional)
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete();

            // Description and reference
            $table->text('description')->nullable();
            $table->string('reference', 100)->nullable()->comment('Invoice number, receipt number, etc.');

            // Attachments tracking
            $table->boolean('has_attachments')->default(false);

            // Status
            $table->string('status', 50)->default('confirmed')->index();
            $table->boolean('is_paid')->default(true)->index();
            $table->boolean('is_recurring')->default(false);

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['date', 'status']);
            $table->index(['expense_category_id', 'date']);
            $table->index(['party_id', 'date']);

            // ⭐ فهرس للسنة المالية ⭐
            $table->index(['fiscal_year_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

