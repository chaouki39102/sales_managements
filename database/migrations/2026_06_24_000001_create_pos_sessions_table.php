<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained()->cascadeOnDelete();

            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();

            $table->decimal('opening_cash', 15, 2)->default(0);
            $table->string('opening_note')->nullable();

            $table->integer('invoices_count')->default(0);
            $table->integer('returns_count')->default(0);
            $table->decimal('gross_sales', 15, 2)->default(0);
            $table->decimal('returns_total', 15, 2)->default(0);
            $table->decimal('net_sales', 15, 2)->default(0);
            $table->decimal('total_tva', 15, 2)->default(0);
            $table->decimal('total_fiscal_stamp', 15, 2)->default(0);
            $table->decimal('total_discount', 15, 2)->default(0);
            $table->decimal('highest_invoice', 15, 2)->default(0);

            $table->decimal('cash_collected', 15, 2)->default(0);
            $table->decimal('cib_collected', 15, 2)->default(0);
            $table->decimal('ccp_collected', 15, 2)->default(0);
            $table->decimal('bank_collected', 15, 2)->default(0);
            $table->decimal('credit_total', 15, 2)->default(0);

            $table->decimal('closing_cash_counted', 15, 2)->nullable();
            $table->decimal('closing_cash_expected', 15, 2)->nullable();
            $table->decimal('cash_difference', 15, 2)->nullable();
            $table->text('closing_note')->nullable();
            $table->text('manager_note')->nullable();

            $table->string('status', 20)->default('open');

            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'user_id', 'opened_at']);
            $table->index(['company_id', 'warehouse_id', 'status']);
        });

        Schema::create('pos_session_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_session_id')->constrained('pos_sessions')->cascadeOnDelete();
            $table->foreignId('payment_mode_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->integer('count')->default(0);
            $table->timestamps();

            $table->unique(['pos_session_id', 'payment_mode_id']);
        });

        Schema::create('pos_session_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_session_id')->constrained('pos_sessions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('product_name');
            $table->decimal('quantity_sold', 12, 3)->default(0);
            $table->decimal('total_ht', 15, 2)->default(0);
            $table->decimal('total_ttc', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['pos_session_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_session_products');
        Schema::dropIfExists('pos_session_payments');
        Schema::dropIfExists('pos_sessions');
    }
};
