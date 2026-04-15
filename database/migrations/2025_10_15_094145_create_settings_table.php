<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for settings table
 *
 * Stores application-wide configuration settings
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('group', 50)->default('general')->index();
            $table->json('value')->nullable();
            $table->string('type', 50)->default('string')->comment('string, integer, boolean, json, etc.');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false)->comment('Can be accessed without authentication');
            $table->boolean('is_editable')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
