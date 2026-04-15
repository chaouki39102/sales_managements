<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_types lookup table
 *
 * Defines types of products (stockable, service, consumable)
 * Replaces the ENUM type field in the products table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('manages_stock')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('product_types')->insert([
            ['name' => 'stockable', 'label' => 'Stockable Product', 'description' => 'Physical product with inventory tracking', 'manages_stock' => true, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'service', 'label' => 'Service', 'description' => 'Non-physical service item', 'manages_stock' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'consumable', 'label' => 'Consumable', 'description' => 'Consumable product without strict inventory tracking', 'manages_stock' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_types');
    }
};
