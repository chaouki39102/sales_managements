<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for party_types lookup table
 *
 * Defines types of parties (customers, suppliers, both)
 * Replaces the ENUM type field in the parties table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('party_types')->insert([
            ['name' => 'client', 'label' => 'Customer', 'description' => 'Customer party type', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'supplier', 'label' => 'Supplier', 'description' => 'Supplier party type', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'both', 'label' => 'Customer & Supplier', 'description' => 'Both customer and supplier', 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('party_types');
    }
};
