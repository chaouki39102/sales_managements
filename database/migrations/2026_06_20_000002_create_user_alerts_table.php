<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('user_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('type', 50)->index();
            $table->string('title', 255);
            $table->text('body')->nullable();
            $table->string('severity', 20)->default('medium')->index();
            $table->unsignedBigInteger('document_id')->nullable()->index();
            $table->unsignedBigInteger('check_id')->nullable()->index();
            $table->unsignedBigInteger('product_id')->nullable()->index();
            $table->unsignedBigInteger('party_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->boolean('is_read')->default(false)->index();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'is_read', 'created_at']);
            $table->index(['company_id', 'type']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('user_alerts');
    }
};
