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

            // ✅ company_id nullable — null = إعدادات عامة للنظام
            $table->foreignId('company_id')
                ->nullable()
                ->constrained('companies')
                ->cascadeOnDelete();

            $table->string('key', 150);
            $table->string('group', 100)->default('general');

            // ✅ value كـ text — نتعامل مع JSON يدوياً في الـ Service
            // (بدل cast إلى array في Model لأنه يُسبب مشاكل مع strings)
            $table->text('value')->nullable();

            $table->string('type', 50)->default('string');
            // أنواع مدعومة: string | integer | float | boolean | json | array

            $table->string('description', 500)->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_editable')->default(true);
            $table->integer('display_order')->default(0);

            $table->timestamps();

            // ✅ Unique: نفس المفتاح لكل شركة (أو null للعامة)
            $table->unique(['company_id', 'key'], 'settings_company_key_unique');

            // ✅ Index للبحث السريع
            $table->index(['company_id', 'group'], 'settings_company_group_idx');
            $table->index('key', 'settings_key_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
