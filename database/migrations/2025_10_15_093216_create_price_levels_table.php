<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('price_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false)->index()->comment('التعريفة الافتراضية عند إنشاء زبون جديد');
            $table->boolean('is_percentage')->default(false)->comment('هل التعريفة نسبية على سعر الشراء');
            $table->decimal('value', 8, 2)->nullable()->comment('قيمة النسبة أو المبلغ الإضافي');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('price_levels');
    }
};
