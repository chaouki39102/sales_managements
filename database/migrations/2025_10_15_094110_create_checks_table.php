<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checks', function (Blueprint $table) {
            $table->id();

            // ✅ check_number: index فقط — الـ unique المركب مع company_id يأتي لاحقاً
            $table->string('check_number', 50)->index();
            $table->date('check_date')->comment('Issue date');
            $table->date('due_date')->nullable()->comment('Due date for post-dated checks');
            $table->decimal('amount', 15, 4);

            // Bank details
            $table->string('bank_name',     100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('drawer_name',   150)->nullable();

            $table->foreignId('party_id')
                ->nullable()->constrained('parties')
                ->nullOnDelete()->cascadeOnUpdate();

            // Status
            $table->string('status', 50)->default('pending')->index()
                ->comment('pending, cleared, bounced, cancelled');
            $table->date('cleared_date')->nullable();
            $table->text('bounce_reason')->nullable();

            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();

            $table->index(['status', 'due_date']);
            $table->index(['party_id', 'status']);
            $table->index('check_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checks');
    }
};
