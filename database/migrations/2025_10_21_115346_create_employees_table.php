<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();

            // ✅ company_id مباشرة — الموظف ينتمي لشركة
            $table->foreignId('company_id')
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // ✅ matricule: unique مركب مع company_id — رقم التسجيل فريد داخل الشركة
            $table->string('matricule', 20)->index()
                ->comment('رقم التسجيل الداخلي');

            $table->foreignId('user_id')
                ->nullable()->constrained('users')
                ->nullOnDelete()->cascadeOnUpdate();

            // Personal
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();

            // ✅ nss: index فقط — unique مركب مع company_id يأتي لاحقاً
            $table->string('nss', 20)->nullable()->index()
                ->comment('رقم الضمان الاجتماعي');

            $table->date('birth_date')->nullable();

            $table->foreignId('gender_id')
                ->nullable()
                ->constrained('genders')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // Banking
            $table->string('rib',       30)->nullable();
            $table->string('bank_name', 100)->nullable();

            // Administrative
            $table->date('hire_date')->nullable();
            $table->date('termination_date')->nullable();

            // ✅ employment_status: string بدلاً من enum للمرونة
            $table->string('employment_status', 30)->default('active')->index()
                ->comment('active | suspended | terminated');

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // ✅ unique مركبة — رقم التسجيل ورقم الضمان فريدان داخل الشركة
            $table->unique(['company_id', 'matricule'], 'employees_company_matricule_unique');
            $table->unique(['company_id', 'nss'],       'employees_company_nss_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
