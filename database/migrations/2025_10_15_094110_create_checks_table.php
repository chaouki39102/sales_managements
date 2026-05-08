<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('check_number', 50)->index();
            $table->date('check_date')->comment('Issue date');
            $table->date('due_date')->nullable()->comment('Due date for post-dated checks');
            $table->decimal('amount', 15, 4);
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('drawer_name', 150)->nullable();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();
            $table->string('status', 50)->default('pending')->index()->comment('pending, cleared, bounced, cancelled');
            $table->date('cleared_date')->nullable();
            $table->text('bounce_reason')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['company_id', 'check_number']);
            $table->index(['company_id', 'status', 'due_date']);
            $table->index(['company_id', 'party_id', 'status']);
            $table->index(['company_id', 'check_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('checks');
    }
};
