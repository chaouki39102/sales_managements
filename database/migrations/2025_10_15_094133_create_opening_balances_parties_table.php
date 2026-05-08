<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('opening_balances_parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->foreignId('party_id')->constrained('parties')->restrictOnDelete();
            $table->decimal('opening_balance', 15, 4);
            $table->enum('balance_type', ['debit', 'credit'])->comment('debit = رصيد مدين, credit = رصيد دائن');
            $table->timestamps();
            $table->unique(['company_id', 'fiscal_year_id', 'party_id'], 'opening_party_unique');
        });
    }
    public function down(): void {
        Schema::dropIfExists('opening_balances_parties');
    }
};
