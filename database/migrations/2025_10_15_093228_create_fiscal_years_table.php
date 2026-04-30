<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();

            // ✅ company_id مباشرة هنا — لا حاجة لـ migration منفصل
            $table->foreignId('company_id')
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // ✅ name ليس unique عالمياً — الـ unique المركب أسفله يكفي
            $table->string('name', 50)->comment('e.g., 2025, FY2025');

            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false)->index();
            $table->timestamp('closed_at')->nullable(); // ✅ timestamp بدلاً من date
            $table->foreignId('closed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('is_current')->default(false)->index();
            $table->text('closing_notes')->nullable();

            $table->timestamps();

            // ✅ unique مركب: نفس الاسم مسموح في شركات مختلفة
            $table->unique(['company_id', 'name'], 'fiscal_years_company_name_unique');

            // فهارس للأداء
            $table->index(['company_id', 'is_current'],        'idx_fy_company_current');
            $table->index(['company_id', 'start_date', 'end_date'], 'idx_fy_company_dates');
            $table->index(['start_date', 'end_date'],           'idx_fy_dates');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};
