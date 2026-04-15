<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for communes table
 *
 * Stores Algerian municipalities (communes) linked to wilayas
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->string('post_code', 10)->nullable()->index();
            $table->string('name', 100);
            $table->string('arabic_name', 100);

            // ✅ CORRECTED: Added explicit table name and cascadeOnUpdate
            // cascadeOnDelete is correct here, as a commune cannot exist without a wilaya.
            $table->foreignId('wilaya_id')
                  ->constrained('wilayas') // تحديد اسم الجدول الأب بوضوح
                  ->cascadeOnDelete()      // (صحيح) احذف البلدية إذا حذفت الولاية
                  ->cascadeOnUpdate();      // (مضاف) حدث المفتاح إذا تغير ID الولاية

            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
    }
};
