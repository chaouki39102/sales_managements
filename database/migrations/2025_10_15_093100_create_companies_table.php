<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug')->unique();
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->unique()->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable()->comment('رأس المال');
            $table->date('rc_date')->nullable()->comment('تاريخ السجل التجاري');
            $table->text('address')->nullable();
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable()->comment('Bank account number');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('active')->default(true);

            // إدارة الحالة والخطط
            $table->timestamp('suspended_at')->nullable()->comment('تاريخ التعليق المؤقت');
            $table->string('suspension_reason', 500)->nullable();
            $table->foreignId('suspended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deactivated_at')->nullable();
            $table->foreignId('deactivated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('plan', 30)->default('free');
            $table->timestamp('trial_ends_at')->nullable();
            $table->unsignedSmallInteger('max_users')->default(3);
            $table->unsignedSmallInteger('max_warehouses')->default(1);
            $table->unsignedInteger('max_products')->default(500);
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('settings_json')->nullable();

            // تدقيق
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            $table->index('plan');
            $table->index('suspended_at');
            $table->index('verified_at');
            $table->index('trial_ends_at');
        });

        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_default')->default(false);
            $table->string('role', 30)->default('member');
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('joined_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
            $table->index(['company_id', 'role']);
            $table->index(['company_id', 'active']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('company_user');
        Schema::dropIfExists('companies');
    }
};
