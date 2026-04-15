<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for stock_movement_types lookup table
 *
 * Defines types of stock movements (in, out, adjustment)
 * Replaces the ENUM movement_type field in stock_movements table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movement_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->smallInteger('direction')->default(0)->comment('-1 for out, 0 for neutral, 1 for in');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('stock_movement_types')->insert([
            ['name' => 'in', 'label' => 'Stock In', 'description' => 'Incoming stock', 'direction' => 1, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'out', 'label' => 'Stock Out', 'description' => 'Outgoing stock', 'direction' => -1, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'adjustment', 'label' => 'Adjustment', 'description' => 'Stock adjustment', 'direction' => 0, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movement_types');
    }
};
