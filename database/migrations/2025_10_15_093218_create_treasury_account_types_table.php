<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for treasury_account_types lookup table
 *
 * Defines types of treasury accounts (bank, cash)
 * Replaces the ENUM type field in treasury_accounts table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_account_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('treasury_account_types')->insert([
            ['name' => 'bank', 'label' => 'Bank Account', 'description' => 'Bank account type', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cash', 'label' => 'Cash', 'description' => 'Cash account type', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_account_types');
    }
};
