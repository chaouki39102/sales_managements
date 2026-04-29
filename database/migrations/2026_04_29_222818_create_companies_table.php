<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug')->unique();

            // Business and Legal Information (Original & New)
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->unique()->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');
            // ✅ IMPROVEMENT: Added Algerian Legal Fields
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable()->comment('رأس المال');
            $table->date('rc_date')->nullable()->comment('تاريخ السجل التجاري');

            // Contact information
            $table->text('address')->nullable();
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->unique();
            $table->string('avatar')->nullable();

            // Banking information
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable()->comment('Bank account number');



            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_user');
        Schema::dropIfExists('companies');
    }
};
