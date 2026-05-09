<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('employment_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('contract_type', ['cdi', 'cdd', 'pre_emploi', 'stage']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('base_salary', 15, 4)->comment('الراتب الأساسي');
            $table->string('job_title');
            $table->string('department')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index('company_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('employment_contracts');
    }
};
