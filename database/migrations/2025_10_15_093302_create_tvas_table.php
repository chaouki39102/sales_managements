<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for tvas table
 *
 * Manages VAT (Value Added Tax) rates
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvas', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->decimal('rate', 8, 2)->default(0.00)->comment('VAT rate percentage');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_default')->default(false)->index()->comment('Default VAT rate');
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['name', 'rate']);
        });

        // Insert default VAT rates for Algeria
        DB::table('tvas')->insert([
            ['name' => 'VAT 19%', 'rate' => 19.00, 'description' => 'Standard VAT rate', 'active' => true, 'is_default' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VAT 9%', 'rate' => 9.00, 'description' => 'Reduced VAT rate', 'active' => true, 'is_default' => false, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VAT 0%', 'rate' => 0.00, 'description' => 'Zero VAT rate', 'active' => true, 'is_default' => false, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tvas');
    }
};
