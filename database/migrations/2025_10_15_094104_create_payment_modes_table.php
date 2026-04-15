<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for payment_modes table
 *
 * Defines payment methods (cash, check, transfer, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_modes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete()->cascadeOnUpdate();

            $table->boolean('requires_reference')->default(false)->comment('Requires check number, transfer reference, etc.');
            $table->boolean('is_cash')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_modes');
    }
};
