<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول وحدات التعبئة — Colisages
 *
 * مثال:
 *   UN  / قارورة  / quantity=1    ← الوحدة الأساسية
 *   FD  / فاردو   / quantity=6
 *   PLT / باليطة  / quantity=480
 *
 * السعر يُحسب دائماً من سعر الوحدة الأساسية × quantity
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_packagings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->string('code', 20)->comment('UN / FD / PLT');
            $table->string('label', 100)->comment('قارورة / فاردو / باليطة');

            // معامل التحويل — كم وحدة أساسية في هذه التعبئة
            $table->decimal('quantity', 15, 4)->default(1)
                ->comment('عدد الوحدات الأساسية في هذه التعبئة');

            $table->string('barcode', 50)->nullable()->unique()
                ->comment('باركود خاص بهذه التعبئة');

            $table->boolean('is_default')->default(false)
                ->comment('الوحدة الأساسية (quantity=1)');

            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);

            $table->timestamps();

            // فهارس
            $table->unique(['product_id', 'code'], 'product_packaging_code_unique');
            $table->index(['product_id', 'active']);
            $table->index(['product_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_packagings');
    }
};
