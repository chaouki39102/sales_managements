<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();

            $table->foreignId('party_type_id')
                ->constrained('party_types')
                ->restrictOnDelete()
                ->cascadeOnUpdate()
                ->name('fk_parties_party_type_id');

            // Identification
            // ✅ code: unique عالمي مقبول — كود داخلي لا يتكرر حتى بين الشركات
            $table->string('code', 50)->nullable()->unique()->index();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            // ✅ slug: unique عالمي مقبول للـ routing
            $table->string('slug')->unique();

            // Legal
            $table->text('activity')->nullable();
            $table->string('rc',  50)->nullable();
            // ✅ nif: index فقط — الـ unique المركب مع company_id يأتي لاحقاً
            $table->string('nif', 50)->nullable()->index()->comment('رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable();
            $table->string('ai',  50)->nullable();
            $table->foreignId('legal_form_id')
                ->nullable()->constrained('legal_forms')
                ->nullOnDelete()->cascadeOnUpdate()
                ->name('fk_parties_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable();
            $table->date('rc_date')->nullable();

            // Contact
            $table->text('address')->nullable();
            $table->foreignId('commune_id')
                ->nullable()->constrained('communes')
                ->nullOnDelete()->cascadeOnUpdate()
                ->name('fk_parties_commune_id');
            $table->foreignId('wilaya_id')
                ->nullable()->constrained('wilayas')
                ->nullOnDelete()->cascadeOnUpdate()
                ->name('fk_parties_wilaya_id');
            $table->string('phone',  20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax',    30)->nullable();
            // ✅ email: index فقط — الـ unique المركب مع company_id يأتي لاحقاً
            $table->string('email', 100)->nullable()->index();
            $table->string('avatar')->nullable();

            // Banking
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable();

            // Financial
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('credit_limit',    15, 4)->default(0.00);
            $table->foreignId('default_price_level_id')
                ->nullable()->constrained('price_levels')
                ->nullOnDelete()->cascadeOnUpdate()
                ->name('fk_parties_price_level_id');
            $table->unsignedInteger('credit_days')->nullable();

            // Tax
            $table->boolean('is_tva_exempt')->default(false)->index();
            $table->boolean('is_taxable')->default(true)->index();
            $table->string('tax_option', 50)->nullable();
            $table->string('cnas_number', 50)->nullable();
            $table->string('tax_regime', 50)->nullable()
                    ->comment('forfaitaire | réel');
            $table->boolean('is_final_consumer')->default(false);
            $table->boolean('is_vat_registered')->default(false);
            $table->date('vat_registration_date')->nullable();

            $table->json('additional_data')->nullable();

            // Status & Audit
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_deleted_by');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['name', 'commercial_name']);
            $table->index(['party_type_id', 'active']);

            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'commercial_name', 'email', 'phone']);
            }
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
