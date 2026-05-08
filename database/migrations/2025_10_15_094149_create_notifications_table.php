<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['company_id', 'notifiable_type', 'notifiable_id'], 'notifications_company_notifiable_idx');
            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('notifications');
    }
};
