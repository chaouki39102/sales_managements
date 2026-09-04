<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('user_id')->nullable();

            // action enum: created | updated | line_added | line_removed | line_modified |
            // price_changed | discount_changed | status_changed | locked | unlocked | cancelled |
            // deleted | payment_added | payment_removed | converted | returned | cloned
            $table->string('action', 40)->index();

            // اسم الحقل المتغيّر (لملخص update)
            $table->string('field_name', 120)->nullable();

            // القيم القديمة/الجديدة (JSON) — أمثلة: {quantity:10} أو خصم قديم
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 1023)->nullable();

            $table->timestamps();

            $table->index(['document_id', 'action']);
            $table->index(['company_id', 'created_at']);
            $table->index('user_id');

            $table->foreign('document_id')
                ->references('id')
                ->on('commercial_documents')
                ->onDelete('cascade');
            $table->foreign('company_id')
                ->references('id')
                ->on('companies')
                ->onDelete('cascade');
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_audit_logs');
    }
};