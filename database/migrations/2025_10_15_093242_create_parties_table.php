<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for parties table (renamed from tiers)
 *
 * Manages customers, suppliers, and business partners with Algerian legal compliance
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();

            // Party type
            // ✅ CORRECTED: Kept restrictOnDelete (field is NOT nullable), added cascadeOnUpdate
            $table->foreignId('party_type_id')->constrained('party_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_parties_party_type_id');

            // Identification
            $table->string('code', 50)->nullable()->unique()->index();
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

            // Financial settings (Original & New)
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('credit_limit', 15, 4)->default(0.00);
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('default_price_level_id')->nullable()->constrained('price_levels')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_price_level_id');
            // ✅ IMPROVEMENT: Added financial fields
            $table->unsignedInteger('credit_days')->nullable()->comment('أجل الدفع الافتراضي بالأيام');

            // Tax settings (Original & New)
            $table->boolean('is_tva_exempt')->default(false)->index()->comment('معفى من TVA؟');
            $table->boolean('is_taxable')->default(true)->index()->comment('VAT exempt status');
            $table->string('tax_option', 50)->nullable()->comment('e.g., TVA sur les débits');

            // ✅ IMPROVEMENT: Added tax and classification fields
            $table->string('cnas_number', 50)->nullable()->comment('رقم التسجيل في CNAS');
            $table->enum('tax_regime', ['forfaitaire', 'réel'])->nullable()->comment('النظام الضريبي');
            $table->boolean('is_final_consumer')->default(false)->comment('يصنف كـ مستهلك نهائي');

            // Additional data
            $table->json('additional_data')->nullable();
            // Disable fullText for SQLite (not supported)
            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'commercial_name', 'email', 'phone']);
            }

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Use nullOnDelete() for audit trails
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_deleted_by');


            $table->boolean('is_vat_registered')->default(false)
                ->comment('مسجل في نظام TVA؟');
            $table->date('vat_registration_date')->nullable();


            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['name', 'commercial_name']);
            $table->index(['party_type_id', 'active']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE parties COMMENT 'لإدارة الأطراف (عملاء، موردون) مع المعلومات القانونية الجزائرية'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('parties');
    }
};
