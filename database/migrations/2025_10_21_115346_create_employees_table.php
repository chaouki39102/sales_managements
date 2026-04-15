<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('matricule', 20)->unique(); // رقم التسجيل
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // معلومات شخصية
            $table->string('first_name');
            $table->string('last_name');
            $table->string('nss', 20)->unique()->comment('رقم الضمان الاجتماعي');
            $table->date('birth_date');
            $table->foreignId('gender_id')->constrained();

            // معلومات بنكية
            $table->string('rib', 30)->nullable();
            $table->string('bank_name', 100)->nullable();

            // معلومات إدارية
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->enum('employment_status', ['active', 'suspended', 'terminated'])->default('active');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
