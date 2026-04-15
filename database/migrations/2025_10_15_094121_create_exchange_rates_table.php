<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->foreignId('to_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->decimal('rate', 15, 8);
            $table->date('rate_date')->index();
            $table->timestamps();
            $table->unique(['from_currency_id', 'to_currency_id', 'rate_date']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE exchange_rates COMMENT 'لتخزين أسعار صرف العملات اليومية'");
    }
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};
