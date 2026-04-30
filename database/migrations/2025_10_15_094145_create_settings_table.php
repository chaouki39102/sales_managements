<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();

            // ✅ company_id nullable:
            //   NULL  = إعداد عام للنظام (مشترك بين كل الشركات)
            //   !NULL = إعداد خاص بشركة معينة (يتجاوز الإعداد العام)
            $table->foreignId('company_id')
                ->nullable()
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->string('key',   100);
            $table->string('group',  50)->default('general')->index();
            $table->json('value')->nullable();
            $table->string('type', 50)->default('string')
                ->comment('string, integer, boolean, json');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_editable')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);

            $table->timestamps();

            // ✅ unique مركب: نفس المفتاح مسموح لكل شركة + نسخة عامة (NULL)
            $table->unique(['company_id', 'key'], 'settings_company_key_unique');
            $table->index(['group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
