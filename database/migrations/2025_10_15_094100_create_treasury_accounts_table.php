<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable()->index();
            $table->foreignId('treasury_account_type_id')->constrained('treasury_account_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('rib', 30)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('swift_bic', 11)->nullable();
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'treasury_account_type_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('treasury_accounts');
    }
};
