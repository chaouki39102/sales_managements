<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_type_id')->constrained('party_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_parties_party_type_id');
            $table->string('code', 50)->nullable();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug');
            $table->text('activity')->nullable();
            $table->string('rc', 50)->nullable();
            $table->string('nif', 50)->nullable()->index()->comment('رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable();
            $table->string('ai', 50)->nullable();
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable();
            $table->date('rc_date')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->index();
            $table->string('avatar')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable();
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('credit_limit', 15, 4)->default(0.00);
            $table->foreignId('default_price_level_id')->nullable()->constrained('price_levels')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_price_level_id');
            $table->unsignedInteger('credit_days')->nullable();
            $table->boolean('is_tva_exempt')->default(false)->index();
            $table->boolean('is_taxable')->default(true)->index();
            $table->string('tax_option', 50)->nullable();
            $table->string('cnas_number', 50)->nullable();
            $table->string('tax_regime', 50)->nullable()->comment('forfaitaire | réel');
            $table->boolean('is_final_consumer')->default(false);
            $table->boolean('is_vat_registered')->default(false);
            $table->date('vat_registration_date')->nullable();
            $table->json('additional_data')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_deleted_by');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->unique(['company_id', 'slug']);
            $table->unique(['company_id', 'nif']);
            $table->unique(['company_id', 'email']);
            $table->index(['name', 'commercial_name']);
            $table->index(['party_type_id', 'active']);

            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'commercial_name', 'email', 'phone']);
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE parties COMMENT 'لإدارة الأطراف (زبائن، موردون) مع المعلومات القانونية الجزائرية'");
        }
    }

    public function down(): void {
        Schema::dropIfExists('parties');
    }
};
