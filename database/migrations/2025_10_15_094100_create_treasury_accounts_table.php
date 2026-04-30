<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->id();

            $table->string('name', 100);
            // ✅ code: index فقط — الـ unique المركب مع company_id يأتي لاحقاً
            $table->string('code', 20)->nullable()->index();

            $table->foreignId('treasury_account_type_id')
                ->constrained('treasury_account_types')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // Bank details
            $table->string('bank_name',     100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('rib',  30)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('swift_bic', 11)->nullable();

            // Financial
            $table->foreignId('currency_id')
                ->nullable()
                ->constrained('currencies')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);

            // Settings
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->text('notes')->nullable();

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['treasury_account_type_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_accounts');
    }
};
